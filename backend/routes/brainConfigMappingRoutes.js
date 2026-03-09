import express from "express";
import cors from "cors";
import { supabase } from "./utils.js";

const router = express.Router();
router.use(cors());
router.use(express.json());

const BRAIN_MAPPING_CORT_TABLE = "cort";

const BRAIN_MAPPING_GM_TABLE = "gm";

const BRAIN_MAPPING_FUNCTION_TABLE = "function";

const BRAIN_MAPPING_TEST_TABLE = "test";

const BRAIN_MAPPING_CORT_GM_TABLE = "cort_gm";

const BRAIN_MAPPING_GM_FUNCTION_TABLE = "gm_function";

const BRAIN_MAPPING_FUNCTION_TEST_TABLE = "function_test";

const BRAIN_MAPPING_DELETE_RPC =
  process.env.BRAIN_MAPPING_DELETE_RPC || "delete_brain_mapping_branch";

const parseUniqueConflict = (details = "") => {
  // Postgres details usually look like:
  // Key (name, hemisphere, lobe)=(STG, l, temporal) already exists.
  const keyMatch = details.match(/Key \((.+)\)=\((.+)\) already exists\./i);
  if (!keyMatch) return { fields: [], values: [] };
  const fields = keyMatch[1]
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
  const values = keyMatch[2]
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return { fields, values };
};

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

const parseIntegerId = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeReferenceId = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized || null;
  }
  return String(value);
};

const normalizeOptionalText = (value) => {
  if (value === undefined) return undefined;
  const normalized = normalizeText(value);
  return normalized || null;
};

const isNoRowsError = (error = {}) => {
  return error.code === "PGRST116";
};

const getLevelLabel = (level = "") => {
  switch (level) {
    case "cort":
      return "Anatomical marker";
    case "gm":
      return "Functional area";
    case "function":
      return "Function";
    case "test":
      return "Test";
    default:
      return "Item";
  }
};

const insertIntoTable = async ({ tableName, payload, selectColumns }) => {
  let query = supabase.from(tableName).insert([payload]);
  if (selectColumns) {
    query = query.select(selectColumns).single();
  } else {
    query = query.select().single();
  }

  let { data, error } = await query;
  return { data, error, targetTable: tableName };
};

const upsertMappingReference = async ({
  tableName,
  parentColumn,
  parentId,
  childColumn,
  childId,
  referenceId,
}) => {
  const {
    data: existingMapping,
    error: existingMappingError,
  } = await supabase
    .from(tableName)
    .select("*")
    .eq(parentColumn, parentId)
    .eq(childColumn, childId)
    .maybeSingle();

  if (existingMappingError) {
    return { data: null, error: existingMappingError, wasUpdate: false };
  }

  if (existingMapping?.id) {
    const { data, error } = await supabase
      .from(tableName)
      .update({ reference_id: referenceId })
      .eq("id", existingMapping.id)
      .select("*")
      .single();

    return { data, error, wasUpdate: true };
  }

  const { data, error } = await insertIntoTable({
    tableName,
    payload: {
      [parentColumn]: parentId,
      [childColumn]: childId,
      reference_id: referenceId,
    },
    selectColumns: "*",
  });

  return { data, error, wasUpdate: false };
};

const buildUniqueConflictResponse = (entityLabel, error, targetTable) => {
  const parsedConflict = parseUniqueConflict(error.details || "");
  const conflictFields = parsedConflict.fields;
  const conflictValues = parsedConflict.values;
  const conflictMessage =
    conflictFields.length > 0
      ? `${entityLabel} already exists (conflict on: ${conflictFields.join(", ")}).`
      : `${entityLabel} already exists.`;

  return {
    success: false,
    error: conflictMessage,
    conflictFields,
    conflictValues,
    constraint: error.constraint || null,
    targetTable,
  };
};

const buildCortTableQuery = ({ tableName, query, hemisphere, lobe }) => {
  let dbQuery = supabase
    .from(tableName)
    .select("id, name, acronym, electrode_label, hemisphere, lobe");

  if (query) {
    dbQuery = dbQuery.ilike("name", `%${query}%`);
  }

  if (hemisphere) {
    const hemiArray = (Array.isArray(hemisphere) ? hemisphere : hemisphere.split(","))
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean);
    if (hemiArray.length > 0) {
      dbQuery = dbQuery.in("hemisphere", hemiArray);
    }
  }

  if (lobe) {
    const lobeArray = (Array.isArray(lobe) ? lobe : lobe.split(","))
      .map((item) => item.trim())
      .filter(Boolean);
    if (lobeArray.length > 0) {
      dbQuery = dbQuery.in("lobe", lobeArray);
    }
  }

  return dbQuery;
};

router.get("/brain-mapping-config", async (req, res) => {
  try {
    const { query, hemisphere, lobe } = req.query;
    const { data: baseCortData, error: baseCortError } = await buildCortTableQuery({
      tableName: BRAIN_MAPPING_CORT_TABLE,
      query,
      hemisphere,
      lobe,
    });

    if (baseCortError) {
      console.error(baseCortError);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch anatomical markers",
      });
    }

    const cortMap = new Map();
    (baseCortData || []).forEach((cortRow) => {
      cortMap.set(cortRow.id, {
        cort_id: cortRow.id,
        cort_name: cortRow.name,
        cort_acronym: cortRow.acronym,
        cort_electrode_label: cortRow.electrode_label,
        cort_hemisphere: cortRow.hemisphere,
        cort_lobe: cortRow.lobe,
        gm: [],
        gmMap: new Map(),
      });
    });

    const cortIds = Array.from(cortMap.keys());
    if (cortIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    const {
      data: cortGmRows,
      error: cortGmError,
    } = await supabase
      .from(BRAIN_MAPPING_CORT_GM_TABLE)
      .select("id, cort_id, gm_id, reference_id")
      .in("cort_id", cortIds);

    if (cortGmError) {
      console.error(cortGmError);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch cort-functional area mappings",
      });
    }

    const gmIds = Array.from(
      new Set((cortGmRows || []).map((row) => row.gm_id).filter(Boolean)),
    );

    let gmRows = [];
    if (gmIds.length > 0) {
      const { data, error } = await supabase
        .from(BRAIN_MAPPING_GM_TABLE)
        .select("id, name, acronym")
        .in("id", gmIds);

      if (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch functional areas",
        });
      }

      gmRows = data || [];
    }

    const gmById = new Map(gmRows.map((row) => [row.id, row]));
    const gmInstanceById = new Map();

    (cortGmRows || []).forEach((row) => {
      const cort = cortMap.get(row.cort_id);
      const gmRow = gmById.get(row.gm_id);
      if (!cort || !gmRow) return;

      const gmObj = {
        gm_id: gmRow.id,
        gm_name: gmRow.name,
        gm_acronym: gmRow.acronym,
        gm_duplicate: null,
        cort_gm: {
          cort_gm_id: row.id,
          cort_gm_cort_id: row.cort_id,
          cort_gm_gm_id: row.gm_id,
          cort_gm_reference_id: row.reference_id,
        },
        function: [],
        funcMap: new Map(),
      };

      cort.gm.push(gmObj);

      if (!gmInstanceById.has(gmRow.id)) {
        gmInstanceById.set(gmRow.id, []);
      }
      gmInstanceById.get(gmRow.id).push(gmObj);
    });

    let gmFunctionRows = [];
    if (gmIds.length > 0) {
      const { data, error } = await supabase
        .from(BRAIN_MAPPING_GM_FUNCTION_TABLE)
        .select("id, gm_id, function_id, reference_id")
        .in("gm_id", gmIds);

      if (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch functional area-function mappings",
        });
      }

      gmFunctionRows = data || [];
    }

    const functionIds = Array.from(
      new Set(gmFunctionRows.map((row) => row.function_id).filter(Boolean)),
    );

    let functionRows = [];
    if (functionIds.length > 0) {
      const { data, error } = await supabase
        .from(BRAIN_MAPPING_FUNCTION_TABLE)
        .select("id, name, description")
        .in("id", functionIds);

      if (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch functions",
        });
      }

      functionRows = data || [];
    }

    const functionById = new Map(functionRows.map((row) => [row.id, row]));
    const functionInstanceById = new Map();

    gmFunctionRows.forEach((row) => {
      const gmInstances = gmInstanceById.get(row.gm_id) || [];
      const functionRow = functionById.get(row.function_id);
      if (!functionRow) return;

      gmInstances.forEach((gmObj) => {
        if (gmObj.funcMap.has(row.id)) return;

        const funcObj = {
          function_id: functionRow.id,
          function_name: functionRow.name,
          function_description: functionRow.description,
          gm_function: {
            gm_function_id: row.id,
            gm_function_gm_id: row.gm_id,
            gm_function_function_id: row.function_id,
            gm_function_reference_id: row.reference_id,
          },
          test: [],
          testMap: new Map(),
        };

        gmObj.funcMap.set(row.id, funcObj);
        gmObj.function.push(funcObj);

        if (!functionInstanceById.has(functionRow.id)) {
          functionInstanceById.set(functionRow.id, []);
        }
        functionInstanceById.get(functionRow.id).push(funcObj);
      });
    });

    let functionTestRows = [];
    if (functionIds.length > 0) {
      const { data, error } = await supabase
        .from(BRAIN_MAPPING_FUNCTION_TEST_TABLE)
        .select("id, function_id, test_id, reference_id")
        .in("function_id", functionIds);

      if (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch function-test mappings",
        });
      }

      functionTestRows = data || [];
    }

    const testIds = Array.from(
      new Set(functionTestRows.map((row) => row.test_id).filter(Boolean)),
    );

    let testRows = [];
    if (testIds.length > 0) {
      const { data, error } = await supabase
        .from(BRAIN_MAPPING_TEST_TABLE)
        .select("id, name, description")
        .in("id", testIds);

      if (error) {
        console.error(error);
        return res.status(500).json({
          success: false,
          error: "Failed to fetch tests",
        });
      }

      testRows = data || [];
    }

    const testById = new Map(testRows.map((row) => [row.id, row]));

    functionTestRows.forEach((row) => {
      const funcInstances = functionInstanceById.get(row.function_id) || [];
      const testRow = testById.get(row.test_id);
      if (!testRow) return;

      funcInstances.forEach((funcObj) => {
        if (funcObj.testMap.has(row.id)) return;

        const testObj = {
          test_id: testRow.id,
          test_name: testRow.name,
          test_description: testRow.description,
          function_test: {
            function_test_id: row.id,
            function_test_function_id: row.function_id,
            function_test_test_id: row.test_id,
            function_test_reference_id: row.reference_id,
          },
        };

        funcObj.testMap.set(row.id, testObj);
        funcObj.test.push(testObj);
      });
    });

    let finalData = Array.from(cortMap.values()).map((cort) => {
      cort.gm.forEach((gm) => {
        gm.function.forEach((func) => {
          delete func.testMap;
        });
        delete gm.funcMap;
      });
      delete cort.gmMap;
      return cort;
    });

    if (query) {
      const q = String(query).toLowerCase();
      finalData = finalData
        .map((cort) => {
          const cortMatch = cort.cort_name?.toLowerCase().includes(q);
          const filteredGm = cort.gm
            .map((gm) => {
              const gmMatch = gm.gm_name?.toLowerCase().includes(q);
              const filteredFunctions = gm.function
                .map((func) => {
                  const funcMatch = func.function_name?.toLowerCase().includes(q);
                  const filteredTests = func.test.filter((test) =>
                    test.test_name?.toLowerCase().includes(q),
                  );
                  if (funcMatch || filteredTests.length > 0) {
                    return {
                      ...func,
                      test: funcMatch ? func.test : filteredTests,
                    };
                  }
                  return null;
                })
                .filter(Boolean);

              if (gmMatch || filteredFunctions.length > 0) {
                return {
                  ...gm,
                  function: gmMatch ? gm.function : filteredFunctions,
                };
              }
              return null;
            })
            .filter(Boolean);

          if (cortMatch || filteredGm.length > 0) {
            return {
              ...cort,
              gm: cortMatch ? cort.gm : filteredGm,
            };
          }
          return null;
        })
        .filter(Boolean);
    }

    return res.status(200).json({
      success: true,
      data: finalData || [],
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: "Unexpected server error",
    });
  }
});

router.post("/brain-mapping-config/anatomical-marker", async (req, res) => {
  try {
    const { name, acronym, hemisphere, lobe, electrodeLabel } = req.body || {};

    const normalizedName = normalizeText(name);
    const normalizedHemisphere = normalizeText(hemisphere).toLowerCase();
    const normalizedLobe = normalizeText(lobe);
    const normalizedAcronym = normalizeText(acronym);
    const normalizedElectrodeLabel = normalizeText(electrodeLabel);

    if (!normalizedName || !normalizedLobe || !["l", "r"].includes(normalizedHemisphere)) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid request body. Required: name, lobe, hemisphere ('l' or 'r').",
      });
    }

    const payload = {
      name: normalizedName,
      acronym: normalizedAcronym || null,
      electrode_label: normalizedElectrodeLabel || null,
      hemisphere: normalizedHemisphere,
      lobe: normalizedLobe,
    };

    const { data, error, targetTable } = await insertIntoTable({
      tableName: BRAIN_MAPPING_CORT_TABLE,
      payload,
      selectColumns: "id, name, acronym, electrode_label, hemisphere, lobe",
    });

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json(
          buildUniqueConflictResponse("An anatomical marker", error, targetTable),
        );
      }

      console.error(error);
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Anatomical marker created successfully",
      data: {
        cort_id: data.id,
        cort_name: data.name,
        cort_acronym: data.acronym,
        cort_electrode_label: data.electrode_label,
        cort_hemisphere: data.hemisphere,
        cort_lobe: data.lobe,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Create operation failed",
    });
  }
});

router.post("/brain-mapping-config/functional-area", async (req, res) => {
  try {
    const { name, acronym } = req.body || {};
    const normalizedName = normalizeText(name);
    const normalizedAcronym = normalizeText(acronym);

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body. Required: name.",
      });
    }

    const { data, error, targetTable } = await insertIntoTable({
      tableName: BRAIN_MAPPING_GM_TABLE,
      payload: {
        name: normalizedName,
        acronym: normalizedAcronym || null,
      },
      selectColumns: "id, name, acronym",
    });

    if (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json(buildUniqueConflictResponse("A functional area", error, targetTable));
      }

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Functional area created successfully",
      data: {
        gm_id: data.id,
        gm_name: data.name,
        gm_acronym: data.acronym,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Create operation failed",
    });
  }
});

router.post("/brain-mapping-config/function", async (req, res) => {
  try {
    const { name, description } = req.body || {};
    const normalizedName = normalizeText(name);
    const normalizedDescription = normalizeText(description);

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body. Required: name.",
      });
    }

    const { data, error, targetTable } = await insertIntoTable({
      tableName: BRAIN_MAPPING_FUNCTION_TABLE,
      payload: {
        name: normalizedName,
        description: normalizedDescription || null,
      },
      selectColumns: "id, name, description",
    });

    if (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json(buildUniqueConflictResponse("A function", error, targetTable));
      }

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Function created successfully",
      data: {
        function_id: data.id,
        function_name: data.name,
        function_description: data.description,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Create operation failed",
    });
  }
});

router.post("/brain-mapping-config/test", async (req, res) => {
  try {
    const { name, description } = req.body || {};
    const normalizedName = normalizeText(name);
    const normalizedDescription = normalizeText(description);

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body. Required: name.",
      });
    }

    const { data, error, targetTable } = await insertIntoTable({
      tableName: BRAIN_MAPPING_TEST_TABLE,
      payload: {
        name: normalizedName,
        description: normalizedDescription || null,
      },
      selectColumns: "id, name, description",
    });

    if (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json(buildUniqueConflictResponse("A test", error, targetTable));
      }

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Test created successfully",
      data: {
        test_id: data.id,
        test_name: data.name,
        test_description: data.description,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Create operation failed",
    });
  }
});

router.post("/brain-mapping-config/mapping/cort-gm", async (req, res) => {
  try {
    const { cortId, gmId, referenceId } = req.body || {};
    const parsedCortId = parseIntegerId(cortId);
    const parsedGmId = parseIntegerId(gmId);
    const parsedReferenceId = normalizeReferenceId(referenceId);

    if (!parsedCortId || !parsedGmId) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body. Required: cortId, gmId.",
      });
    }

    const { data, error, wasUpdate } = await upsertMappingReference({
      tableName: BRAIN_MAPPING_CORT_GM_TABLE,
      parentColumn: "cort_id",
      parentId: parsedCortId,
      childColumn: "gm_id",
      childId: parsedGmId,
      referenceId: parsedReferenceId,
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(wasUpdate ? 200 : 201).json({
      success: true,
      message: wasUpdate
        ? "Cort to functional area mapping reference updated successfully"
        : "Cort to functional area mapping created successfully",
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Create operation failed",
    });
  }
});

router.post("/brain-mapping-config/mapping/gm-function", async (req, res) => {
  try {
    const { gmId, functionId, referenceId } = req.body || {};
    const parsedGmId = parseIntegerId(gmId);
    const parsedFunctionId = parseIntegerId(functionId);
    const parsedReferenceId = normalizeReferenceId(referenceId);

    if (!parsedGmId || !parsedFunctionId) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body. Required: gmId, functionId.",
      });
    }

    const { data, error, wasUpdate } = await upsertMappingReference({
      tableName: BRAIN_MAPPING_GM_FUNCTION_TABLE,
      parentColumn: "gm_id",
      parentId: parsedGmId,
      childColumn: "function_id",
      childId: parsedFunctionId,
      referenceId: parsedReferenceId,
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(wasUpdate ? 200 : 201).json({
      success: true,
      message: wasUpdate
        ? "Functional area to function mapping reference updated successfully"
        : "Functional area to function mapping created successfully",
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Create operation failed",
    });
  }
});

router.post("/brain-mapping-config/mapping/function-test", async (req, res) => {
  try {
    const { functionId, testId, referenceId } = req.body || {};
    const parsedFunctionId = parseIntegerId(functionId);
    const parsedTestId = parseIntegerId(testId);
    const parsedReferenceId = normalizeReferenceId(referenceId);

    if (!parsedFunctionId || !parsedTestId) {
      return res.status(400).json({
        success: false,
        error: "Invalid request body. Required: functionId, testId.",
      });
    }

    const { data, error, wasUpdate } = await upsertMappingReference({
      tableName: BRAIN_MAPPING_FUNCTION_TEST_TABLE,
      parentColumn: "function_id",
      parentId: parsedFunctionId,
      childColumn: "test_id",
      childId: parsedTestId,
      referenceId: parsedReferenceId,
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(wasUpdate ? 200 : 201).json({
      success: true,
      message: wasUpdate
        ? "Function to test mapping reference updated successfully"
        : "Function to test mapping created successfully",
      data,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Create operation failed",
    });
  }
});

router.patch("/brain-mapping-config/:level/:id", async (req, res) => {
  const { level, id } = req.params;
  const parsedId = parseIntegerId(id);

  if (!parsedId) {
    return res.status(400).json({
      success: false,
      error: "Invalid id.",
    });
  }

  try {
    let tableName = null;
    let entityLabel = "This item";
    let selectColumns = "id";
    let responseData = null;
    const payload = {};

    if (level === "cort") {
      tableName = BRAIN_MAPPING_CORT_TABLE;
      entityLabel = "An anatomical marker";
      selectColumns = "id, name, acronym, electrode_label, hemisphere, lobe";

      if (req.body.name !== undefined) {
        const normalizedName = normalizeText(req.body.name);
        if (!normalizedName) {
          return res.status(400).json({
            success: false,
            error: "name cannot be empty.",
          });
        }
        payload.name = normalizedName;
      }

      if (req.body.acronym !== undefined) {
        payload.acronym = normalizeOptionalText(req.body.acronym);
      }

      if (req.body.electrodeLabel !== undefined) {
        payload.electrode_label = normalizeOptionalText(req.body.electrodeLabel);
      }

      if (req.body.hemisphere !== undefined) {
        const normalizedHemisphere = normalizeText(req.body.hemisphere).toLowerCase();
        if (!["l", "r"].includes(normalizedHemisphere)) {
          return res.status(400).json({
            success: false,
            error: "hemisphere must be 'l' or 'r'.",
          });
        }
        payload.hemisphere = normalizedHemisphere;
      }

      if (req.body.lobe !== undefined) {
        const normalizedLobe = normalizeText(req.body.lobe);
        if (!normalizedLobe) {
          return res.status(400).json({
            success: false,
            error: "lobe cannot be empty.",
          });
        }
        payload.lobe = normalizedLobe;
      }
    } else if (level === "gm") {
      tableName = BRAIN_MAPPING_GM_TABLE;
      entityLabel = "A functional area";
      selectColumns = "id, name, acronym";

      if (req.body.name !== undefined) {
        const normalizedName = normalizeText(req.body.name);
        if (!normalizedName) {
          return res.status(400).json({
            success: false,
            error: "name cannot be empty.",
          });
        }
        payload.name = normalizedName;
      }

      if (req.body.acronym !== undefined) {
        payload.acronym = normalizeOptionalText(req.body.acronym);
      }
    } else if (level === "function") {
      tableName = BRAIN_MAPPING_FUNCTION_TABLE;
      entityLabel = "A function";
      selectColumns = "id, name, description";

      if (req.body.name !== undefined) {
        const normalizedName = normalizeText(req.body.name);
        if (!normalizedName) {
          return res.status(400).json({
            success: false,
            error: "name cannot be empty.",
          });
        }
        payload.name = normalizedName;
      }

      if (req.body.description !== undefined) {
        payload.description = normalizeOptionalText(req.body.description);
      }
    } else if (level === "test") {
      tableName = BRAIN_MAPPING_TEST_TABLE;
      entityLabel = "A test";
      selectColumns = "id, name, description";

      if (req.body.name !== undefined) {
        const normalizedName = normalizeText(req.body.name);
        if (!normalizedName) {
          return res.status(400).json({
            success: false,
            error: "name cannot be empty.",
          });
        }
        payload.name = normalizedName;
      }

      if (req.body.description !== undefined) {
        payload.description = normalizeOptionalText(req.body.description);
      }
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid level. Supported: cort, gm, function, test.",
      });
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No updatable fields were provided.",
      });
    }

    const { data, error } = await supabase
      .from(tableName)
      .update(payload)
      .eq("id", parsedId)
      .select(selectColumns)
      .single();

    if (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json(buildUniqueConflictResponse(entityLabel, error, tableName));
      }

      if (isNoRowsError(error)) {
        return res.status(404).json({
          success: false,
          error: `${getLevelLabel(level)} not found.`,
        });
      }

      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    if (level === "cort") {
      responseData = {
        cort_id: data.id,
        cort_name: data.name,
        cort_acronym: data.acronym,
        cort_electrode_label: data.electrode_label,
        cort_hemisphere: data.hemisphere,
        cort_lobe: data.lobe,
      };
    } else if (level === "gm") {
      responseData = {
        gm_id: data.id,
        gm_name: data.name,
        gm_acronym: data.acronym,
      };
    } else if (level === "function") {
      responseData = {
        function_id: data.id,
        function_name: data.name,
        function_description: data.description,
      };
    } else {
      responseData = {
        test_id: data.id,
        test_name: data.name,
        test_description: data.description,
      };
    }

    return res.status(200).json({
      success: true,
      message: `${getLevelLabel(level)} updated successfully`,
      data: responseData,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Update operation failed",
    });
  }
});

router.delete("/brain-mapping-config/:level/:id", async (req, res) => {
  const { level, id } = req.params;

  try {
    const { data, error } = await supabase.rpc(BRAIN_MAPPING_DELETE_RPC, {
      p_level: level,
      p_id: parseInt(id),
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: `${level} branch deleted successfully`,
      details: data,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      error: "Delete operation failed",
    });
  }
});

export default router;
