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
} from "@mantine/core";

import { Plus, Edit2, Trash2, Search } from "lucide-react";

import { modals } from "@mantine/modals";
import { notifications } from "@mantine/notifications";

const backendURL = __APP_CONFIG__.backendURL;

/* ---------- COMPONENT ---------- */

export function BrainMapping() {
  const [query, setQuery] = useState("");
  const [mappingData, setMappingData] = useState([]);
  const [searchScope, setSearchScope] = useState("all");

  const [openCorts, setOpenCorts] = useState([]);
  const [openGms, setOpenGms] = useState([]);
  const [openFunctions, setOpenFunctions] = useState([]);

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
    const token = localStorage.getItem("token");
    if (!token) {
      showError("User not authenticated. Please log in to open epilepsy.");
      return;
    }

    const response = fetch(`${backendURL}/api/brain-mapping-config`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
    })
      .then((res) => res.json())
      .then((res) => {
        setMappingData(res.data);
      })
      .catch((err) => {
        console.error("Error fetching brain mapping config:", err);
        showError(
          "Failed to load brain mapping configuration. Please try again later.",
        );
      });
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

  const toTitleCase = (str = "") => {
    return str
      .toLowerCase()
      .replace(/(^|\s|-)\w/g, (match) => match.toUpperCase());
  };

  return (
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
        <Button leftSection={<Plus size={16} />} w={230}>
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
                    <ActionIcon variant="light">
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
                  >
                    Add Functional Area
                  </Button>

                  {/* GM ACCORDION */}
                  {cort.gm?.filter((g) => g.gm_id).length > 0 && (
                    <Accordion multiple value={openGms} onChange={setOpenGms}>
                      {cort.gm?.filter((gm) => gm.gm_id).length > 0 &&
                        cort.gm
                          .filter((gm) => gm.gm_id)
                          .map((gm) => (
                            <Accordion.Item
                              key={gm.gm_id}
                              value={String(gm.gm_id)}
                            >
                              <Accordion.Control>
                                <Card withBorder radius="md" bg="cyan.0">
                                  <Group justify="space-between">
                                    <Stack gap={2}>
                                      <Group>
                                        <Text fw={500}>
                                          {toTitleCase(gm.gm_name)}
                                        </Text>
                                        <Badge color="cyan">
                                          Functional Area
                                        </Badge>
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
                                        onClick={(e) => e.stopPropagation()}
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
                                </Card>
                              </Accordion.Control>

                              {/* GM PANEL */}
                              <Accordion.Panel>
                                <Stack>
                                  <Button
                                    size="xs"
                                    variant="light"
                                    color="green"
                                    leftSection={<Plus size={14} />}
                                    w="fit-content"
                                  >
                                    Add Function
                                  </Button>

                                  {/* FUNCTION ACCORDION */}
                                  {gm.function?.filter((f) => f.function_id)
                                    .length > 0 && (
                                    <Accordion
                                      multiple
                                      value={openFunctions}
                                      onChange={setOpenFunctions}
                                    >
                                      {gm.function?.filter((f) => f.function_id)
                                        .length > 0 &&
                                        gm.function
                                          .filter((f) => f.function_id)
                                          .map((func) => (
                                            <Accordion.Item
                                              key={func.function_id}
                                              value={String(func.function_id)}
                                            >
                                              <Accordion.Control>
                                                <Card
                                                  withBorder
                                                  radius="md"
                                                  bg="green.0"
                                                >
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
                                                        <Text
                                                          size="sm"
                                                          c="dimmed"
                                                        >
                                                          {
                                                            func.function_description
                                                          }
                                                        </Text>
                                                      )}
                                                    </Stack>

                                                    <Group>
                                                      <ActionIcon
                                                        variant="light"
                                                        onClick={(e) =>
                                                          e.stopPropagation()
                                                        }
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
                                                </Card>
                                              </Accordion.Control>

                                              {/* FUNCTION PANEL */}
                                              <Accordion.Panel>
                                                <Stack>
                                                  <Button
                                                    size="xs"
                                                    variant="light"
                                                    color="violet"
                                                    leftSection={
                                                      <Plus size={14} />
                                                    }
                                                    w="fit-content"
                                                  >
                                                    Add Test
                                                  </Button>

                                                  {/* TEST LIST */}
                                                  <Box
                                                    pl="lg"
                                                    style={{ maxWidth: "97%" }}
                                                  >
                                                    {func.test?.filter(
                                                      (t) => t.test_id,
                                                    ).length > 0 &&
                                                      func.test
                                                        .filter(
                                                          (t) => t.test_id,
                                                        )
                                                        .map((test) => (
                                                          <Card
                                                            key={test.test_id}
                                                            withBorder
                                                            radius="md"
                                                            bg="violet.0"
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
                                                                  onClick={(
                                                                    e,
                                                                  ) =>
                                                                    e.stopPropagation()
                                                                  }
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
                                                </Stack>
                                              </Accordion.Panel>
                                            </Accordion.Item>
                                          ))}
                                    </Accordion>
                                  )}
                                </Stack>
                              </Accordion.Panel>
                            </Accordion.Item>
                          ))}
                    </Accordion>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
    </Container>
  );
}
