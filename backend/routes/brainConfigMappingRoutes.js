import express from "express";
import cors from "cors";
import { supabase } from "./utils.js";

const router = express.Router();
router.use(cors());
router.use(express.json());

router.get("/brain-mapping-config", async (req, res) => {
  try {
    const { query, hemisphere, lobe } = req.query;

    /* ================= DATABASE QUERY ================= */

    let dbQuery = supabase.from("cort_gm_function_test_mapping_view").select(`
        cort_id, cort_name, cort_acronym, cort_electrode_label, cort_hemisphere, cort_lobe,

        cort_gm_id, cort_gm_cort_id, cort_gm_gm_id, cort_gm_reference_id,

        gm_id, gm_name, gm_acronym, gm_duplicate,

        gm_function_id, gm_function_gm_id, gm_function_function_id, gm_function_reference_id,

        function_id, function_name, function_description,

        function_test_id, function_test_function_id, function_test_test_id, function_test_reference_id,

        test_id, test_name, test_description
      `);

    /* ---------- SEARCH ---------- */
    if (query) {
      dbQuery = dbQuery.or(`
        cort_name.ilike.%${query}%,
        gm_name.ilike.%${query}%,
        function_name.ilike.%${query}%,
        test_name.ilike.%${query}%
      `);
    }

    /* ---------- FILTERS ---------- */
    if (hemisphere) {
      const hemiArray = Array.isArray(hemisphere)
        ? hemisphere
        : hemisphere.split(",");
      dbQuery = dbQuery.in("cort_hemisphere", hemiArray);
    }

    if (lobe) {
      const lobeArray = Array.isArray(lobe) ? lobe : lobe.split(",");
      dbQuery = dbQuery.in("cort_lobe", lobeArray);
    }

    const { data, error } = await dbQuery;

    if (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        error: "Database error occurred",
      });
    }

    if (!data?.length) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    /* ================= GROUPING ================= */

    const cortMap = new Map();

    data.forEach((row) => {
      /* ---------- CORT ---------- */

      if (!cortMap.has(row.cort_id)) {
        cortMap.set(row.cort_id, {
          cort_id: row.cort_id,
          cort_name: row.cort_name,
          cort_acronym: row.cort_acronym,
          cort_electrode_label: row.cort_electrode_label,
          cort_hemisphere: row.cort_hemisphere,
          cort_lobe: row.cort_lobe,
          gm: [],
          gmMap: new Map(),
        });
      }

      const cort = cortMap.get(row.cort_id);

      /* ---------- GM + CORT_GM MAPPING ---------- */

      const gmKey = row.cort_gm_id;

      if (!cort.gmMap.has(gmKey)) {
        const gmObj = {
          gm_id: row.gm_id,
          gm_name: row.gm_name,
          gm_acronym: row.gm_acronym,
          gm_duplicate: row.gm_duplicate,

          /* mapping */
          cort_gm: {
            cort_gm_id: row.cort_gm_id,
            cort_gm_cort_id: row.cort_gm_cort_id,
            cort_gm_gm_id: row.cort_gm_gm_id,
            cort_gm_reference_id: row.cort_gm_reference_id,
          },

          function: [],
          funcMap: new Map(),
        };

        cort.gmMap.set(gmKey, gmObj);
        cort.gm.push(gmObj);
      }

      const gm = cort.gmMap.get(gmKey);

      /* ---------- FUNCTION + GM_FUNCTION MAPPING ---------- */

      const funcKey = row.gm_function_id;

      if (!gm.funcMap.has(funcKey)) {
        const funcObj = {
          function_id: row.function_id,
          function_name: row.function_name,
          function_description: row.function_description,

          gm_function: {
            gm_function_id: row.gm_function_id,
            gm_function_gm_id: row.gm_function_gm_id,
            gm_function_function_id: row.gm_function_function_id,
            gm_function_reference_id: row.gm_function_reference_id,
          },

          test: [],
          testMap: new Map(),
        };

        gm.funcMap.set(funcKey, funcObj);
        gm.function.push(funcObj);
      }

      const func = gm.funcMap.get(funcKey);

      /* ---------- TEST + FUNCTION_TEST MAPPING ---------- */

      const testKey = row.function_test_id;

      if (!func.testMap.has(testKey)) {
        const testObj = {
          test_id: row.test_id,
          test_name: row.test_name,
          test_description: row.test_description,

          function_test: {
            function_test_id: row.function_test_id,
            function_test_function_id: row.function_test_function_id,
            function_test_test_id: row.function_test_test_id,
            function_test_reference_id: row.function_test_reference_id,
          },
        };

        func.testMap.set(testKey, testObj);
        func.test.push(testObj);
      }
    });

    /* ================= CLEAN INTERNAL MAPS ================= */

    const finalData = Array.from(cortMap.values()).map((cort) => {
      cort.gm.forEach((gm) => {
        gm.function.forEach((func) => {
          delete func.testMap;
        });
        delete gm.funcMap;
      });
      delete cort.gmMap;
      return cort;
    });

    /* ================= SUCCESS RESPONSE ================= */

    return res.status(200).json({
      success: true,
      data: finalData,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      error: "Unexpected server error",
    });
  }
});

router.delete("/brain-mapping-config/:level/:id", async (req, res) => {
  const { level, id } = req.params;

  try {
    const { data, error } = await supabase.rpc("delete_brain_mapping_branch", {
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
