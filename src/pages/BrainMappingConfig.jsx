import { useState, useMemo, useEffect } from "react";
import {
  Accordion,
  Card,
  Text,
  Badge,
  Group,
  Button,
  Stack,
  Box,
  ActionIcon,
  Container,
  Title,
  TextInput,
  Select,
  Modal,
  SimpleGrid,
} from "@mantine/core";

import { Plus, Edit2, Trash2, Search } from "lucide-react";

import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";

const backendURL = __APP_CONFIG__.backendURL;

const LOBE_OPTIONS = [
  { value: "frontal", label: "Frontal" },
  { value: "temporal", label: "Temporal" },
  { value: "parietal", label: "Parietal" },
  { value: "occipital", label: "Occipital" },
  { value: "insula", label: "Insula" },
  { value: "limbic", label: "Limbic" },
];

const createInitialBranchDraft = () => ({
  cort: {
    name: "",
    acronym: "",
    hemisphere: "l",
    lobe: "",
    electrodeLabel: "",
  },
});

const createInitialFunctionalAreaDraft = () => ({
  name: "",
  acronym: "",
  referenceId: "",
});

const createInitialFunctionDraft = () => ({
  name: "",
  description: "",
  referenceId: "",
});

const createInitialTestDraft = () => ({
  name: "",
  description: "",
  referenceId: "",
});

const createInitialEditDraft = () => ({
  name: "",
  acronym: "",
  hemisphere: "l",
  lobe: "",
  electrodeLabel: "",
  description: "",
});

/* ---------- COMPONENT ---------- */

export function BrainMapping() {
  const [query, setQuery] = useState("");
  const [mappingData, setMappingData] = useState([]);
  const [searchScope, setSearchScope] = useState("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [branchDraft, setBranchDraft] = useState(createInitialBranchDraft());
  const [functionalAreaModalOpen, setFunctionalAreaModalOpen] = useState(false);
  const [selectedCortForFunctionalArea, setSelectedCortForFunctionalArea] =
    useState(null);
  const [functionalAreaDraft, setFunctionalAreaDraft] = useState(
    createInitialFunctionalAreaDraft(),
  );
  const [isCreatingFunctionalArea, setIsCreatingFunctionalArea] = useState(false);
  const [functionModalOpen, setFunctionModalOpen] = useState(false);
  const [selectedGmForFunction, setSelectedGmForFunction] = useState(null);
  const [functionDraft, setFunctionDraft] = useState(createInitialFunctionDraft());
  const [isCreatingFunction, setIsCreatingFunction] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [selectedFunctionForTest, setSelectedFunctionForTest] = useState(null);
  const [testDraft, setTestDraft] = useState(createInitialTestDraft());
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editEntity, setEditEntity] = useState(null);
  const [editDraft, setEditDraft] = useState(createInitialEditDraft());
  const [isUpdatingEntity, setIsUpdatingEntity] = useState(false);

  const [openCorts, setOpenCorts] = useState([]);
  const [openGms, setOpenGms] = useState([]);
  const [openFunctions, setOpenFunctions] = useState([]);

  const toTitleCase = (str = "") => {
    return str
      .toLowerCase()
      .replace(/(^|\s|-)\w/g, (match) => match.toUpperCase());
  };

  const showError = (message) => {
    notifications.show({
      title: "Error",
      message,
      color: "red",
    });
  };

  const fetchMappings = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showError("User not authenticated. Please log in to open epilepsy.");
      return;
    }

    try {
      const res = await fetch(`${backendURL}/api/brain-mapping-config`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load brain mapping config (${res.status})`);
      }

      const payload = await res.json();
      setMappingData(Array.isArray(payload?.data) ? payload.data : []);
    } catch (err) {
      console.error("Error fetching brain mapping config:", err);
      showError(
        "Failed to load brain mapping configuration. Please try again later.",
      );
    }
  };

  const closeCreateBranchModal = () => {
    setCreateModalOpen(false);
  };

  const openCreateBranchModal = () => {
    setBranchDraft(createInitialBranchDraft());
    setCreateModalOpen(true);
  };

  const updateCortDraft = (field, value) => {
    setBranchDraft((prev) => ({
      ...prev,
      cort: {
        ...prev.cort,
        [field]: value ?? "",
      },
    }));
  };

  const canSubmitCreate = useMemo(() => {
    const hasCort =
      branchDraft.cort.name.trim() &&
      branchDraft.cort.hemisphere &&
      branchDraft.cort.lobe;

    return !!hasCort;
  }, [branchDraft]);

  const handleCreateAnatomicalMarker = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showError("User not authenticated. Please log in to continue.");
      return;
    }

    try {
      const res = await fetch(
        `${backendURL}/api/brain-mapping-config/anatomical-marker`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            name: branchDraft.cort.name,
            acronym: branchDraft.cort.acronym,
            hemisphere: branchDraft.cort.hemisphere,
            lobe: branchDraft.cort.lobe,
            electrodeLabel: branchDraft.cort.electrodeLabel,
          }),
        },
      );

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          notifications.show({
            title: "Already exists",
            message: payload?.error || "This anatomical marker already exists.",
            color: "yellow",
          });
          return;
        }
        throw new Error(payload?.error || "Failed to create anatomical marker.");
      }

      notifications.show({
        title: "Created",
        message: "Anatomical marker added successfully",
        color: "green",
      });

      closeCreateBranchModal();
      await fetchMappings();
    } catch (err) {
      showError(err?.message || "Failed to create anatomical marker.");
    }
  };

  const closeFunctionalAreaModal = () => {
    setFunctionalAreaModalOpen(false);
    setSelectedCortForFunctionalArea(null);
    setFunctionalAreaDraft(createInitialFunctionalAreaDraft());
    setIsCreatingFunctionalArea(false);
  };

  const openFunctionalAreaModal = (cort) => {
    setSelectedCortForFunctionalArea({
      id: cort.cort_id,
      name: cort.cort_name,
    });
    setFunctionalAreaDraft(createInitialFunctionalAreaDraft());
    setFunctionalAreaModalOpen(true);
  };

  const updateFunctionalAreaDraft = (field, value) => {
    setFunctionalAreaDraft((prev) => ({
      ...prev,
      [field]: value ?? "",
    }));
  };

  const canSubmitFunctionalArea = useMemo(() => {
    return !!(
      selectedCortForFunctionalArea?.id &&
      functionalAreaDraft.name.trim().length > 0
    );
  }, [selectedCortForFunctionalArea, functionalAreaDraft.name]);

  const handleCreateFunctionalArea = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showError("User not authenticated. Please log in to continue.");
      return;
    }

    if (!selectedCortForFunctionalArea?.id) {
      showError("No anatomical marker selected.");
      return;
    }

    try {
      setIsCreatingFunctionalArea(true);

      const createRes = await fetch(
        `${backendURL}/api/brain-mapping-config/functional-area`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            name: functionalAreaDraft.name,
            acronym: functionalAreaDraft.acronym,
          }),
        },
      );

      const createPayload = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        if (createRes.status === 409) {
          notifications.show({
            title: "Already exists",
            message: createPayload?.error || "This functional area already exists.",
            color: "yellow",
          });
          return;
        }
        throw new Error(createPayload?.error || "Failed to create functional area.");
      }

      const gmId = createPayload?.data?.gm_id;
      if (!gmId) {
        throw new Error("Functional area created, but missing gm_id in response.");
      }

      const mapRes = await fetch(
        `${backendURL}/api/brain-mapping-config/mapping/cort-gm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            cortId: selectedCortForFunctionalArea.id,
            gmId,
            referenceId: functionalAreaDraft.referenceId || null,
          }),
        },
      );

      const mapPayload = await mapRes.json().catch(() => ({}));
      if (!mapRes.ok) {
        if (mapRes.status === 409) {
          notifications.show({
            title: "Already mapped",
            message:
              mapPayload?.error ||
              "This functional area is already mapped under the selected anatomical marker.",
            color: "yellow",
          });
          return;
        }
        throw new Error(
          mapPayload?.error ||
            "Functional area created, but failed to map it under the selected anatomical marker.",
        );
      }

      notifications.show({
        title: "Created",
        message: "Functional area added successfully",
        color: "green",
      });

      closeFunctionalAreaModal();
      await fetchMappings();
    } catch (err) {
      showError(err?.message || "Failed to create functional area.");
    } finally {
      setIsCreatingFunctionalArea(false);
    }
  };

  const closeFunctionModal = () => {
    setFunctionModalOpen(false);
    setSelectedGmForFunction(null);
    setFunctionDraft(createInitialFunctionDraft());
    setIsCreatingFunction(false);
  };

  const openFunctionModal = (cort, gm) => {
    setSelectedGmForFunction({
      id: gm.gm_id,
      name: gm.gm_name,
      cortName: cort.cort_name,
    });
    setFunctionDraft(createInitialFunctionDraft());
    setFunctionModalOpen(true);
  };

  const updateFunctionDraft = (field, value) => {
    setFunctionDraft((prev) => ({
      ...prev,
      [field]: value ?? "",
    }));
  };

  const canSubmitFunction = useMemo(() => {
    return !!(selectedGmForFunction?.id && functionDraft.name.trim().length > 0);
  }, [selectedGmForFunction, functionDraft.name]);

  const handleCreateFunction = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showError("User not authenticated. Please log in to continue.");
      return;
    }

    if (!selectedGmForFunction?.id) {
      showError("No functional area selected.");
      return;
    }

    try {
      setIsCreatingFunction(true);

      const createRes = await fetch(`${backendURL}/api/brain-mapping-config/function`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          name: functionDraft.name,
          description: functionDraft.description,
        }),
      });

      const createPayload = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        if (createRes.status === 409) {
          notifications.show({
            title: "Already exists",
            message: createPayload?.error || "This function already exists.",
            color: "yellow",
          });
          return;
        }
        throw new Error(createPayload?.error || "Failed to create function.");
      }

      const functionId = createPayload?.data?.function_id;
      if (!functionId) {
        throw new Error("Function created, but missing function_id in response.");
      }

      const mapRes = await fetch(
        `${backendURL}/api/brain-mapping-config/mapping/gm-function`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            gmId: selectedGmForFunction.id,
            functionId,
            referenceId: functionDraft.referenceId || null,
          }),
        },
      );

      const mapPayload = await mapRes.json().catch(() => ({}));
      if (!mapRes.ok) {
        if (mapRes.status === 409) {
          notifications.show({
            title: "Already mapped",
            message:
              mapPayload?.error ||
              "This function is already mapped under the selected functional area.",
            color: "yellow",
          });
          return;
        }
        throw new Error(
          mapPayload?.error ||
            "Function created, but failed to map it under the selected functional area.",
        );
      }

      notifications.show({
        title: "Created",
        message: "Function added successfully",
        color: "green",
      });

      closeFunctionModal();
      await fetchMappings();
    } catch (err) {
      showError(err?.message || "Failed to create function.");
    } finally {
      setIsCreatingFunction(false);
    }
  };

  const closeTestModal = () => {
    setTestModalOpen(false);
    setSelectedFunctionForTest(null);
    setTestDraft(createInitialTestDraft());
    setIsCreatingTest(false);
  };

  const openTestModal = (cort, gm, func) => {
    setSelectedFunctionForTest({
      id: func.function_id,
      name: func.function_name,
      gmName: gm.gm_name,
      cortName: cort.cort_name,
    });
    setTestDraft(createInitialTestDraft());
    setTestModalOpen(true);
  };

  const updateTestDraft = (field, value) => {
    setTestDraft((prev) => ({
      ...prev,
      [field]: value ?? "",
    }));
  };

  const canSubmitTest = useMemo(() => {
    return !!(selectedFunctionForTest?.id && testDraft.name.trim().length > 0);
  }, [selectedFunctionForTest, testDraft.name]);

  const handleCreateTest = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showError("User not authenticated. Please log in to continue.");
      return;
    }

    if (!selectedFunctionForTest?.id) {
      showError("No function selected.");
      return;
    }

    try {
      setIsCreatingTest(true);

      const createRes = await fetch(`${backendURL}/api/brain-mapping-config/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          name: testDraft.name,
          description: testDraft.description,
        }),
      });

      const createPayload = await createRes.json().catch(() => ({}));
      if (!createRes.ok) {
        if (createRes.status === 409) {
          notifications.show({
            title: "Already exists",
            message: createPayload?.error || "This test already exists.",
            color: "yellow",
          });
          return;
        }
        throw new Error(createPayload?.error || "Failed to create test.");
      }

      const testId = createPayload?.data?.test_id;
      if (!testId) {
        throw new Error("Test created, but missing test_id in response.");
      }

      const mapRes = await fetch(
        `${backendURL}/api/brain-mapping-config/mapping/function-test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify({
            functionId: selectedFunctionForTest.id,
            testId,
            referenceId: testDraft.referenceId || null,
          }),
        },
      );

      const mapPayload = await mapRes.json().catch(() => ({}));
      if (!mapRes.ok) {
        if (mapRes.status === 409) {
          notifications.show({
            title: "Already mapped",
            message:
              mapPayload?.error ||
              "This test is already mapped under the selected function.",
            color: "yellow",
          });
          return;
        }
        throw new Error(
          mapPayload?.error ||
            "Test created, but failed to map it under the selected function.",
        );
      }

      notifications.show({
        title: "Created",
        message: "Test added successfully",
        color: "green",
      });

      closeTestModal();
      await fetchMappings();
    } catch (err) {
      showError(err?.message || "Failed to create test.");
    } finally {
      setIsCreatingTest(false);
    }
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditEntity(null);
    setEditDraft(createInitialEditDraft());
    setIsUpdatingEntity(false);
  };

  const openEditModal = (level, entity) => {
    setEditEntity({
      level,
      id:
        level === "cort"
          ? entity.cort_id
          : level === "gm"
            ? entity.gm_id
            : level === "function"
              ? entity.function_id
              : entity.test_id,
      displayName:
        level === "cort"
          ? entity.cort_name
          : level === "gm"
            ? entity.gm_name
            : level === "function"
              ? entity.function_name
              : entity.test_name,
    });

    if (level === "cort") {
      setEditDraft({
        name: entity.cort_name || "",
        acronym: entity.cort_acronym || "",
        hemisphere: entity.cort_hemisphere || "l",
        lobe: entity.cort_lobe || "",
        electrodeLabel: entity.cort_electrode_label || "",
        description: "",
      });
    } else if (level === "gm") {
      setEditDraft({
        name: entity.gm_name || "",
        acronym: entity.gm_acronym || "",
        hemisphere: "l",
        lobe: "",
        electrodeLabel: "",
        description: "",
      });
    } else if (level === "function") {
      setEditDraft({
        name: entity.function_name || "",
        acronym: "",
        hemisphere: "l",
        lobe: "",
        electrodeLabel: "",
        description: entity.function_description || "",
      });
    } else {
      setEditDraft({
        name: entity.test_name || "",
        acronym: "",
        hemisphere: "l",
        lobe: "",
        electrodeLabel: "",
        description: entity.test_description || "",
      });
    }

    setEditModalOpen(true);
  };

  const updateEditDraft = (field, value) => {
    setEditDraft((prev) => ({
      ...prev,
      [field]: value ?? "",
    }));
  };

  const canSubmitEdit = useMemo(() => {
    if (!editEntity?.level) return false;
    if (!editDraft.name.trim()) return false;

    if (editEntity.level === "cort") {
      return !!(editDraft.hemisphere && editDraft.lobe);
    }

    return true;
  }, [editEntity, editDraft]);

  const handleUpdateEntity = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      showError("User not authenticated. Please log in to continue.");
      return;
    }

    if (!editEntity?.id || !editEntity?.level) {
      showError("No entity selected for update.");
      return;
    }

    let payload;
    if (editEntity.level === "cort") {
      payload = {
        name: editDraft.name,
        acronym: editDraft.acronym,
        hemisphere: editDraft.hemisphere,
        lobe: editDraft.lobe,
        electrodeLabel: editDraft.electrodeLabel,
      };
    } else if (editEntity.level === "gm") {
      payload = {
        name: editDraft.name,
        acronym: editDraft.acronym,
      };
    } else if (editEntity.level === "function") {
      payload = {
        name: editDraft.name,
        description: editDraft.description,
      };
    } else {
      payload = {
        name: editDraft.name,
        description: editDraft.description,
      };
    }

    try {
      setIsUpdatingEntity(true);

      const res = await fetch(
        `${backendURL}/api/brain-mapping-config/${editEntity.level}/${editEntity.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
          body: JSON.stringify(payload),
        },
      );

      const responsePayload = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) {
          notifications.show({
            title: "Already exists",
            message:
              responsePayload?.error ||
              `${getLevelLabel(editEntity.level)} with these details already exists.`,
            color: "yellow",
          });
          return;
        }
        if (res.status === 404) {
          throw new Error(
            responsePayload?.error || `${getLevelLabel(editEntity.level)} not found.`,
          );
        }
        throw new Error(
          responsePayload?.error || `Failed to update ${getLevelLabel(editEntity.level)}.`,
        );
      }

      notifications.show({
        title: "Updated",
        message: `${getLevelLabel(editEntity.level)} updated successfully`,
        color: "green",
      });

      closeEditModal();
      await fetchMappings();
    } catch (err) {
      showError(err?.message || "Failed to update item.");
    } finally {
      setIsUpdatingEntity(false);
    }
  };

  /* ---------- SEARCH FILTER ---------- */

  const filteredMappings = useMemo(() => {
    if (!query.trim()) return mappingData;

    const q = query.toLowerCase();

    return mappingData
      .map((cort) => {
        const cortMatch =
          searchScope === "all" || searchScope === "cort"
            ? cort.cort_name?.toLowerCase().includes(q)
            : false;

        const filteredGMs = cort.gm
          ?.map((gm) => {
            const gmMatch =
              searchScope === "all" || searchScope === "gm"
                ? gm.gm_name?.toLowerCase().includes(q)
                : false;

            const filteredFunctions = gm.function
              ?.map((func) => {
                const funcMatch =
                  searchScope === "all" || searchScope === "function"
                    ? func.function_name?.toLowerCase().includes(q)
                    : false;

                const filteredTests = func.test?.filter((test) =>
                  searchScope === "all" || searchScope === "test"
                    ? test.test_name?.toLowerCase().includes(q)
                    : false,
                );

                if (funcMatch || filteredTests?.length > 0) {
                  return {
                    ...func,
                    test: funcMatch ? func.test : filteredTests,
                  };
                }

                return null;
              })
              .filter(Boolean);

            if (gmMatch || filteredFunctions?.length > 0) {
              return {
                ...gm,
                function: gmMatch ? gm.function : filteredFunctions,
              };
            }

            return null;
          })
          .filter(Boolean);

        if (cortMatch || filteredGMs?.length > 0) {
          return {
            ...cort,
            gm: cortMatch ? cort.gm : filteredGMs,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [query, mappingData, searchScope]);

  useEffect(() => {
    if (!query.trim()) {
      setOpenCorts([]);
      setOpenGms([]);
      setOpenFunctions([]);
      return;
    }

    const cortIds = [];
    const gmIds = [];
    const funcIds = [];

    filteredMappings.forEach((cort) => {
      cortIds.push(String(cort.cort_id));

      cort.gm?.forEach((gm) => {
        gmIds.push(String(gm.gm_id));

        gm.function?.forEach((func) => {
          funcIds.push(String(func.function_id));
        });
      });
    });

    setOpenCorts(cortIds);
    setOpenGms(gmIds);
    setOpenFunctions(funcIds);
  }, [query, filteredMappings]);

  /* ---------- UI ---------- */

  useEffect(() => {
    fetchMappings();
  }, []);

  const getLevelLabel = (level) => {
    switch (level) {
      case "cort":
        return "Anatomical Marker";
      case "gm":
        return "Functional Area";
      case "function":
        return "Function";
      case "test":
        return "Test";
      default:
        return level;
    }
  };

  const handleDelete = (level, id, name) => {
    console.log("Modal Opened for:", level, id, name); // Debug log
    modals.openConfirmModal({
      title: `Delete ${toTitleCase(level)}`,
      centered: true,

      children: (
        <>
          <Text size="sm">You are about to delete:</Text>

          <Text fw={600} mt={6}>
            {name}
          </Text>

          <Text size="sm" c="red" mt="md">
            ⚠ This will permanently remove this {getLevelLabel(level)} and all
            associated mappings below it.
          </Text>

          <Text size="sm" c="red">
            This action cannot be undone.
          </Text>
        </>
      ),

      labels: { confirm: "Delete", cancel: "Cancel" },

      confirmProps: { color: "red" },

      onConfirm: async () => {
        try {
          const token = localStorage.getItem("token");

          const res = await fetch(
            `${backendURL}/api/brain-mapping-config/${level}/${id}`,
            {
              method: "DELETE",
              headers: {
                Authorization: token,
              },
            },
          );

          if (!res.ok) throw new Error();

          notifications.show({
            title: "Deleted",
            message: `${name} removed successfully`,
            color: "green",
          });

          // refresh data after delete
          fetchMappings(); // 👈 call your fetch function
        } catch (err) {
          notifications.show({
            title: "Error",
            message: "Failed to delete item",
            color: "red",
          });
        }
      },
    });
  };

  return (
    <>
      <Modal
        opened={createModalOpen}
        onClose={closeCreateBranchModal}
        title="Add Anatomical Marker"
        size="lg"
        centered
        zIndex={3000}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            This form creates anatomical markers only. Add functional areas
            using the `Add Functional Area` button under each marker in the main
            display.
          </Text>

          <Card withBorder radius="md" bg="blue.0">
            <Stack>
              <Group justify="space-between">
                <Text fw={600}>Anatomical Marker</Text>
                <Badge color="blue">Cort</Badge>
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2 }}>
                <TextInput
                  label="Name"
                  placeholder="e.g. superior temporal gyrus"
                  value={branchDraft.cort.name}
                  onChange={(e) => updateCortDraft("name", e.target.value)}
                  required
                />
                <TextInput
                  label="Acronym"
                  placeholder="e.g. STG"
                  value={branchDraft.cort.acronym}
                  onChange={(e) => updateCortDraft("acronym", e.target.value)}
                />
                <Select
                  label="Hemisphere"
                  data={[
                    { value: "l", label: "Left" },
                    { value: "r", label: "Right" },
                  ]}
                  value={branchDraft.cort.hemisphere}
                  onChange={(value) => updateCortDraft("hemisphere", value)}
                  required
                />
                <Select
                  label="Lobe"
                  data={LOBE_OPTIONS}
                  value={branchDraft.cort.lobe || null}
                  onChange={(value) => updateCortDraft("lobe", value)}
                  comboboxProps={{ zIndex: 3500 }}
                  searchable
                  required
                />
                <TextInput
                  label="Electrode Label"
                  placeholder="Optional"
                  value={branchDraft.cort.electrodeLabel}
                  onChange={(e) =>
                    updateCortDraft("electrodeLabel", e.target.value)
                  }
                />
              </SimpleGrid>
            </Stack>
          </Card>

          <Group justify="space-between">
            <Button
              variant="default"
              onClick={closeCreateBranchModal}
            >
              Close
            </Button>
            <Button
              onClick={handleCreateAnatomicalMarker}
              disabled={!canSubmitCreate}
            >
              Add Anatomical Marker
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={functionalAreaModalOpen}
        onClose={closeFunctionalAreaModal}
        title="Add Functional Area"
        size="md"
        centered
        zIndex={3000}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Anatomical Marker:{" "}
            {selectedCortForFunctionalArea
              ? toTitleCase(selectedCortForFunctionalArea.name)
              : "-"}
          </Text>

          <TextInput
            label="Functional Area Name"
            placeholder="e.g. posterior language network"
            value={functionalAreaDraft.name}
            onChange={(e) => updateFunctionalAreaDraft("name", e.target.value)}
            required
          />

          <TextInput
            label="Acronym"
            placeholder="Optional"
            value={functionalAreaDraft.acronym}
            onChange={(e) =>
              updateFunctionalAreaDraft("acronym", e.target.value)
            }
          />

          <TextInput
            label="Reference ID"
            placeholder="Optional (DOI / citation link id)"
            value={functionalAreaDraft.referenceId}
            onChange={(e) =>
              updateFunctionalAreaDraft("referenceId", e.target.value)
            }
          />

          <Group justify="space-between">
            <Button
              variant="default"
              onClick={closeFunctionalAreaModal}
              disabled={isCreatingFunctionalArea}
            >
              Close
            </Button>
            <Button
              onClick={handleCreateFunctionalArea}
              disabled={!canSubmitFunctionalArea}
              loading={isCreatingFunctionalArea}
            >
              Add Functional Area
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={functionModalOpen}
        onClose={closeFunctionModal}
        title="Add Function"
        size="md"
        centered
        zIndex={3000}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Anatomical Marker:{" "}
            {selectedGmForFunction ? toTitleCase(selectedGmForFunction.cortName) : "-"}
          </Text>
          <Text size="sm" c="dimmed">
            Functional Area:{" "}
            {selectedGmForFunction ? toTitleCase(selectedGmForFunction.name) : "-"}
          </Text>

          <TextInput
            label="Function Name"
            placeholder="e.g. language comprehension"
            value={functionDraft.name}
            onChange={(e) => updateFunctionDraft("name", e.target.value)}
            required
          />

          <TextInput
            label="Description"
            placeholder="Optional"
            value={functionDraft.description}
            onChange={(e) => updateFunctionDraft("description", e.target.value)}
          />

          <TextInput
            label="Reference ID"
            placeholder="Optional (DOI / citation link id)"
            value={functionDraft.referenceId}
            onChange={(e) => updateFunctionDraft("referenceId", e.target.value)}
          />

          <Group justify="space-between">
            <Button
              variant="default"
              onClick={closeFunctionModal}
              disabled={isCreatingFunction}
            >
              Close
            </Button>
            <Button
              onClick={handleCreateFunction}
              disabled={!canSubmitFunction}
              loading={isCreatingFunction}
            >
              Add Function
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={testModalOpen}
        onClose={closeTestModal}
        title="Add Test"
        size="md"
        centered
        zIndex={3000}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Anatomical Marker:{" "}
            {selectedFunctionForTest
              ? toTitleCase(selectedFunctionForTest.cortName)
              : "-"}
          </Text>
          <Text size="sm" c="dimmed">
            Functional Area:{" "}
            {selectedFunctionForTest
              ? toTitleCase(selectedFunctionForTest.gmName)
              : "-"}
          </Text>
          <Text size="sm" c="dimmed">
            Function:{" "}
            {selectedFunctionForTest
              ? toTitleCase(selectedFunctionForTest.name)
              : "-"}
          </Text>

          <TextInput
            label="Test Name"
            placeholder="e.g. auditory naming"
            value={testDraft.name}
            onChange={(e) => updateTestDraft("name", e.target.value)}
            required
          />

          <TextInput
            label="Description"
            placeholder="Optional"
            value={testDraft.description}
            onChange={(e) => updateTestDraft("description", e.target.value)}
          />

          <TextInput
            label="Reference ID"
            placeholder="Optional (DOI / citation link id)"
            value={testDraft.referenceId}
            onChange={(e) => updateTestDraft("referenceId", e.target.value)}
          />

          <Group justify="space-between">
            <Button
              variant="default"
              onClick={closeTestModal}
              disabled={isCreatingTest}
            >
              Close
            </Button>
            <Button
              onClick={handleCreateTest}
              disabled={!canSubmitTest}
              loading={isCreatingTest}
            >
              Add Test
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={editModalOpen}
        onClose={closeEditModal}
        title={`Edit ${getLevelLabel(editEntity?.level || "")}`}
        size={editEntity?.level === "cort" ? "lg" : "md"}
        centered
        zIndex={3000}
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Editing: {editEntity ? toTitleCase(editEntity.displayName || "") : "-"}
          </Text>

          {editEntity?.level === "cort" ? (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Name"
                value={editDraft.name}
                onChange={(e) => updateEditDraft("name", e.target.value)}
                required
              />
              <TextInput
                label="Acronym"
                value={editDraft.acronym}
                onChange={(e) => updateEditDraft("acronym", e.target.value)}
              />
              <Select
                label="Hemisphere"
                data={[
                  { value: "l", label: "Left" },
                  { value: "r", label: "Right" },
                ]}
                value={editDraft.hemisphere || null}
                onChange={(value) => updateEditDraft("hemisphere", value)}
                required
              />
              <Select
                label="Lobe"
                data={LOBE_OPTIONS}
                value={editDraft.lobe || null}
                onChange={(value) => updateEditDraft("lobe", value)}
                comboboxProps={{ zIndex: 3500 }}
                searchable
                required
              />
              <TextInput
                label="Electrode Label"
                value={editDraft.electrodeLabel}
                onChange={(e) =>
                  updateEditDraft("electrodeLabel", e.target.value)
                }
              />
            </SimpleGrid>
          ) : (
            <>
              <TextInput
                label="Name"
                value={editDraft.name}
                onChange={(e) => updateEditDraft("name", e.target.value)}
                required
              />

              {(editEntity?.level === "gm" ||
                editEntity?.level === "function" ||
                editEntity?.level === "test") && (
                <TextInput
                  label={editEntity?.level === "gm" ? "Acronym" : "Description"}
                  value={
                    editEntity?.level === "gm"
                      ? editDraft.acronym
                      : editDraft.description
                  }
                  onChange={(e) =>
                    updateEditDraft(
                      editEntity?.level === "gm" ? "acronym" : "description",
                      e.target.value,
                    )
                  }
                />
              )}
            </>
          )}

          <Group justify="space-between">
            <Button
              variant="default"
              onClick={closeEditModal}
              disabled={isUpdatingEntity}
            >
              Close
            </Button>
            <Button
              onClick={handleUpdateEntity}
              disabled={!canSubmitEdit}
              loading={isUpdatingEntity}
            >
              Update
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Container size="lg" py="xl">
      <Stack>
        <Title>Brain Mapping Config</Title>

        {/* SEARCH BAR */}
        <Group>
          <TextInput
            leftSection={<Search size={16} />}
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <Select
            value={searchScope}
            onChange={setSearchScope}
            data={[
              { value: "all", label: "All" },
              { value: "cort", label: "Anatomical Marker" },
              { value: "gm", label: "Functional Area" },
              { value: "function", label: "Function" },
              { value: "test", label: "Test" },
            ]}
          />
        </Group>

        {/* ADD CORT BUTTON */}
        <Button
          leftSection={<Plus size={16} />}
          w={230}
          onClick={openCreateBranchModal}
        >
          Add Anatomical Marker
        </Button>

        {/* MAIN TREE */}
        <Accordion
          variant="separated"
          multiple
          value={openCorts}
          onChange={setOpenCorts}
          styles={{
            control: {
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: "transparent",
              },
              "&[data-active]": {
                backgroundColor: "transparent",
              },
            },
            panel: {
              backgroundColor: "transparent",
            },
          }}
        >
          {filteredMappings?.map((cort) => (
            <Accordion.Item key={cort.cort_id} value={String(cort.cort_id)}>
              {/* CORT HEADER */}
              <Accordion.Control>
                <Group justify="space-between">
                  <Stack gap={2}>
                    <Group>
                      <Text fw={600}>{toTitleCase(cort.cort_name)}</Text>
                      <Badge color="blue">Anatomical Marker</Badge>
                    </Group>

                    <Stack gap={0}>
                      <Text size="xs" c="dimmed">
                        Acronym: {cort.cort_acronym}
                      </Text>

                      <Text size="xs" c="dimmed">
                        Hemisphere:{" "}
                        {cort.cort_hemisphere === "l" ? "Left" : "Right"}
                      </Text>

                      <Text size="xs" c="dimmed">
                        Lobe: {cort.cort_lobe}
                      </Text>

                      {cort.cort_electrode_label && (
                        <Text size="xs" c="dimmed">
                          Electrode: {cort.cort_electrode_label}
                        </Text>
                      )}
                    </Stack>
                  </Stack>

                  <Group>
                    <ActionIcon
                      variant="light"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal("cort", cort);
                      }}
                    >
                      <Edit2 size={14} />
                    </ActionIcon>

                    <ActionIcon
                      color="red"
                      variant="light"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete("cort", cort.cort_id, cort.cort_name);
                      }}
                    >
                      <Trash2 size={14} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Accordion.Control>

              {/* CORT PANEL */}
              <Accordion.Panel>
                <Stack>
                  <Button
                    size="xs"
                    variant="light"
                    color="cyan"
                    leftSection={<Plus size={14} />}
                    w="fit-content"
                    onClick={() => openFunctionalAreaModal(cort)}
                  >
                    Add Functional Area
                  </Button>

                  {/* GM ACCORDION */}
                  {cort.gm?.filter((g) => g.gm_id).length > 0 && (
                    <Accordion
                      multiple
                      value={openGms}
                      onChange={setOpenGms}
                      styles={{
                        control: {
                          backgroundColor: "transparent",
                          "&:hover": {
                            backgroundColor: "transparent",
                          },
                          "&[data-active]": {
                            backgroundColor: "transparent",
                          },
                        },
                        panel: {
                          backgroundColor: "transparent",
                        },
                      }}
                    >
                      {cort.gm?.filter((gm) => gm.gm_id).length > 0 &&
                        cort.gm
                          .filter((gm) => gm.gm_id)
                          .map((gm) => {
                            const gmFunctions =
                              gm.function?.filter((f) => f.function_id) || [];

                            return (
                              <Accordion.Item
                                key={gm.gm_id}
                                value={String(gm.gm_id)}
                                style={{
                                  backgroundColor: "var(--mantine-color-cyan-0)",
                                  border: "1px solid var(--mantine-color-cyan-2)",
                                  borderRadius: 10,
                                  overflow: "hidden",
                                  marginBottom: 10,
                                }}
                              >
                                <Accordion.Control>
                                  <Group justify="space-between">
                                    <Stack gap={2}>
                                      <Group>
                                        <Text fw={500}>
                                          {toTitleCase(gm.gm_name)}
                                        </Text>
                                        <Badge color="cyan">Functional Area</Badge>
                                      </Group>

                                      {gm.gm_acronym && (
                                        <Text size="sm" c="dimmed">
                                          Acronym: {gm.gm_acronym}
                                        </Text>
                                      )}
                                    </Stack>

                                    <Group>
                                      <ActionIcon
                                        variant="light"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditModal("gm", gm);
                                        }}
                                      >
                                        <Edit2 size={14} />
                                      </ActionIcon>

                                      <ActionIcon
                                        color="red"
                                        variant="light"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(
                                            "gm",
                                            gm.gm_id,
                                            gm.gm_name,
                                          );
                                        }}
                                      >
                                        <Trash2 size={14} />
                                      </ActionIcon>
                                    </Group>
                                  </Group>
                                </Accordion.Control>

                                {/* GM PANEL */}
                                <Accordion.Panel>
                                  <Stack px="sm" pb="sm">
                                    {gmFunctions.length > 0 ? (
                                      <Group justify="space-between" align="center">
                                        <Text size="sm" fw={500} c="cyan.8">
                                          Functions under {toTitleCase(gm.gm_name)}
                                        </Text>
                                        <Button
                                          size="xs"
                                          variant="light"
                                          color="green"
                                          leftSection={<Plus size={14} />}
                                          onClick={() => openFunctionModal(cort, gm)}
                                        >
                                          Add Function
                                        </Button>
                                      </Group>
                                    ) : (
                                      <Button
                                        size="xs"
                                        variant="light"
                                        color="green"
                                        leftSection={<Plus size={14} />}
                                        w="fit-content"
                                        onClick={() => openFunctionModal(cort, gm)}
                                      >
                                        Add Function
                                      </Button>
                                    )}

                                    {/* FUNCTION ACCORDION */}
                                    {gmFunctions.length > 0 && (
                                      <Accordion
                                        multiple
                                        value={openFunctions}
                                        onChange={setOpenFunctions}
                                      >
                                        {gmFunctions.map((func) => {
                                          const funcTests =
                                            func.test?.filter((t) => t.test_id) || [];

                                          return (
                                            <Accordion.Item
                                              key={func.function_id}
                                              value={String(func.function_id)}
                                              style={{
                                                backgroundColor:
                                                  "var(--mantine-color-green-0)",
                                                border:
                                                  "1px solid var(--mantine-color-green-3)",
                                                borderRadius: 10,
                                                overflow: "hidden",
                                              }}
                                            >
                                              <Accordion.Control>
                                                <Group justify="space-between">
                                                  <Stack gap={2}>
                                                    <Group>
                                                      <Text fw={500}>
                                                        {toTitleCase(
                                                          func.function_name,
                                                        )}
                                                      </Text>
                                                      <Badge color="green">
                                                        Function
                                                      </Badge>
                                                    </Group>

                                                    {func.function_description && (
                                                      <Text size="sm" c="dimmed">
                                                        {
                                                          func.function_description
                                                        }
                                                      </Text>
                                                    )}
                                                  </Stack>

                                                  <Group>
                                                    <ActionIcon
                                                      variant="light"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditModal(
                                                          "function",
                                                          func,
                                                        );
                                                      }}
                                                    >
                                                      <Edit2 size={14} />
                                                    </ActionIcon>

                                                    <ActionIcon
                                                      color="red"
                                                      variant="light"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(
                                                          "function",
                                                          func.function_id,
                                                          func.function_name,
                                                        );
                                                      }}
                                                    >
                                                      <Trash2 size={14} />
                                                    </ActionIcon>
                                                  </Group>
                                                </Group>
                                              </Accordion.Control>

                                              {/* FUNCTION PANEL */}
                                              <Accordion.Panel>
                                                <Box
                                                  p="sm"
                                                  style={{
                                                    backgroundColor:
                                                      "var(--mantine-color-violet-0)",
                                                    border:
                                                      "1px solid var(--mantine-color-violet-2)",
                                                    borderRadius: 10,
                                                  }}
                                                >
                                                  <Stack>
                                                    {funcTests.length > 0 ? (
                                                      <Group
                                                        justify="space-between"
                                                        align="center"
                                                      >
                                                        <Text
                                                          size="sm"
                                                          fw={500}
                                                          c="violet.8"
                                                        >
                                                          Tests under{" "}
                                                          {toTitleCase(
                                                            func.function_name,
                                                          )}
                                                        </Text>
                                                        <Button
                                                          size="xs"
                                                          variant="light"
                                                          color="violet"
                                                          leftSection={
                                                            <Plus size={14} />
                                                          }
                                                          onClick={() =>
                                                            openTestModal(
                                                              cort,
                                                              gm,
                                                              func,
                                                            )
                                                          }
                                                        >
                                                          Add Test
                                                        </Button>
                                                      </Group>
                                                    ) : (
                                                      <Button
                                                        size="xs"
                                                        variant="light"
                                                        color="violet"
                                                        leftSection={
                                                          <Plus size={14} />
                                                        }
                                                        w="fit-content"
                                                        onClick={() =>
                                                          openTestModal(
                                                            cort,
                                                            gm,
                                                            func,
                                                          )
                                                        }
                                                      >
                                                        Add Test
                                                      </Button>
                                                    )}

                                                    {/* TEST LIST */}
                                                    {funcTests.length > 0 && (
                                                      <Box
                                                        style={{ maxWidth: "100%" }}
                                                      >
                                                        {funcTests.map((test) => (
                                                          <Card
                                                            key={test.test_id}
                                                            withBorder
                                                            radius="md"
                                                            bg="white"
                                                            mb="sm"
                                                          >
                                                            <Group justify="space-between">
                                                              <Stack gap={2}>
                                                                <Group>
                                                                  <Text>
                                                                    {toTitleCase(
                                                                      test.test_name,
                                                                    )}
                                                                  </Text>
                                                                  <Badge color="violet">
                                                                    Test
                                                                  </Badge>
                                                                </Group>

                                                                {test.test_description && (
                                                                  <Text
                                                                    size="sm"
                                                                    c="dimmed"
                                                                  >
                                                                    {
                                                                      test.test_description
                                                                    }
                                                                  </Text>
                                                                )}
                                                              </Stack>

                                                              <Group>
                                                                <ActionIcon
                                                                  variant="light"
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openEditModal(
                                                                      "test",
                                                                      test,
                                                                    );
                                                                  }}
                                                                >
                                                                  <Edit2
                                                                    size={14}
                                                                  />
                                                                </ActionIcon>

                                                                <ActionIcon
                                                                  color="red"
                                                                  variant="light"
                                                                  onClick={(
                                                                    e,
                                                                  ) => {
                                                                    e.stopPropagation();
                                                                    handleDelete(
                                                                      "test",
                                                                      test.test_id,
                                                                      test.test_name,
                                                                    );
                                                                  }}
                                                                >
                                                                  <Trash2
                                                                    size={14}
                                                                  />
                                                                </ActionIcon>
                                                              </Group>
                                                            </Group>
                                                          </Card>
                                                        ))}
                                                      </Box>
                                                    )}
                                                  </Stack>
                                                </Box>
                                              </Accordion.Panel>
                                            </Accordion.Item>
                                          );
                                        })}
                                      </Accordion>
                                    )}
                                  </Stack>
                                </Accordion.Panel>
                              </Accordion.Item>
                            );
                          })}
                    </Accordion>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
      </Container>
    </>
  );
}
