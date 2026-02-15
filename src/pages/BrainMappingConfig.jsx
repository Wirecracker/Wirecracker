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

const backendURL = __APP_CONFIG__.backendURL;

/* ---------- DATA ---------- */

const initialMappings = [
  {
    id: "cort1",
    name: "Left Temporal Cort",
    description: "Left hemisphere temporal cortical region",
    gms: [
      {
        id: "gm1",
        name: "Language GM",
        description: "Language network grey matter",
        functions: [
          {
            id: "func1",
            name: "Language Processing",
            description: "Verbal language comprehension and production",
            tests: [
              {
                id: "test1",
                name: "Boston Naming Test",
                description: "Confrontation naming ability",
              },
              {
                id: "test2",
                name: "Token Test",
                description: "Auditory comprehension assessment",
              },
            ],
          },
          {
            id: "func2",
            name: "Semantic Retrieval",
            description: "Word meaning and conceptual access",
            tests: [
              {
                id: "test3",
                name: "Category Fluency Test",
                description: "Semantic word generation",
              },
            ],
          },
        ],
      },
      {
        id: "gm2",
        name: "Verbal Memory GM",
        description: "Encoding and recall grey matter network",
        functions: [
          {
            id: "func3",
            name: "Verbal Learning",
            description: "Word list acquisition and recall",
            tests: [
              {
                id: "test4",
                name: "CVLT-II",
                description: "California Verbal Learning Test",
              },
              {
                id: "test5",
                name: "Logical Memory",
                description: "Narrative recall assessment",
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "cort2",
    name: "Right Temporal Cort",
    description: "Right hemisphere temporal cortical region",
    gms: [
      {
        id: "gm3",
        name: "Visual Memory GM",
        description: "Non-verbal visual encoding and recall",
        functions: [
          {
            id: "func4",
            name: "Visual Recall",
            description: "Retention of visual information",
            tests: [
              {
                id: "test6",
                name: "Rey Complex Figure Recall",
                description: "Visual memory recall performance",
              },
              {
                id: "test7",
                name: "Benton Visual Retention",
                description: "Short-term visual memory",
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "cort3",
    name: "Frontal Cort",
    description: "Executive and decision making cortex",
    gms: [
      {
        id: "gm4",
        name: "Executive Control GM",
        description: "Planning and cognitive flexibility network",
        functions: [
          {
            id: "func5",
            name: "Cognitive Flexibility",
            description: "Task switching and adaptability",
            tests: [
              {
                id: "test8",
                name: "Trail Making Test B",
                description: "Executive switching ability",
              },
              {
                id: "test9",
                name: "Wisconsin Card Sorting Test",
                description: "Set-shifting performance",
              },
            ],
          },
          {
            id: "func6",
            name: "Response Inhibition",
            description: "Impulse and inhibition control",
            tests: [
              {
                id: "test10",
                name: "Stroop Color Word Test",
                description: "Inhibitory control performance",
              },
            ],
          },
        ],
      },
    ],
  },

  {
    id: "cort4",
    name: "Parietal Cort",
    description: "Spatial attention and sensory integration cortex",
    gms: [
      {
        id: "gm5",
        name: "Spatial Processing GM",
        description: "Spatial orientation and attention network",
        functions: [
          {
            id: "func7",
            name: "Spatial Awareness",
            description: "Environmental spatial perception",
            tests: [
              {
                id: "test11",
                name: "Line Bisection Test",
                description: "Spatial neglect screening",
              },
              {
                id: "test12",
                name: "Clock Drawing Test",
                description: "Visuospatial planning ability",
              },
            ],
          },
        ],
      },
    ],
  },
];

/* ---------- COMPONENT ---------- */

export function BrainMapping() {
  const [mappings] = useState(initialMappings);
  const [query, setQuery] = useState("");
  const [mappingData, setMappingData] = useState([]);
  const [searchScope, setSearchScope] = useState("all");

  /* ---------- SEARCH FILTER ---------- */

  const filteredMappings = useMemo(() => {
    if (!query.trim()) return mappings;

    const q = query.toLowerCase();

    return mappings
      .map((cort) => {
        const cortMatch =
          searchScope === "all" || searchScope === "cort"
            ? cort.name.toLowerCase().includes(q)
            : false;

        const filteredGMs = cort.gms
          .map((gm) => {
            const gmMatch =
              searchScope === "all" || searchScope === "gm"
                ? gm.name.toLowerCase().includes(q)
                : false;

            const filteredFunctions = gm.functions
              .map((func) => {
                const funcMatch =
                  searchScope === "all" || searchScope === "function"
                    ? func.name.toLowerCase().includes(q)
                    : false;

                const filteredTests = func.tests.filter((test) =>
                  searchScope === "all" || searchScope === "test"
                    ? test.name.toLowerCase().includes(q)
                    : false
                );

                if (funcMatch || filteredTests.length > 0) {
                  return {
                    ...func,
                    tests: funcMatch ? func.tests : filteredTests,
                  };
                }

                return null;
              })
              .filter(Boolean);

            if (gmMatch || filteredFunctions.length > 0) {
              return {
                ...gm,
                functions: gmMatch ? gm.functions : filteredFunctions,
              };
            }

            return null;
          })
          .filter(Boolean);

        if (cortMatch || filteredGMs.length > 0) {
          return {
            ...cort,
            gms: cortMatch ? cort.gms : filteredGMs,
          };
        }

        return null;
      })
      .filter(Boolean);
  }, [query, mappings, searchScope]);
  

  /* ---------- UI ---------- */

  useEffect(() => {

  const token = localStorage.getItem('token');
  if (!token) {
      showError('User not authenticated. Please log in to open epilepsy.');
      return;
  }

    const response = fetch(`${backendURL}/api/brain-mapping-config`, {
      method: 'GET',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': token
      },
  }).then(res => res.json())
    .then(res => 
    {
      setMappingData(res.data);
    })
    .catch(err => {
      console.error('Error fetching brain mapping config:', err);
      showError('Failed to load brain mapping configuration. Please try again later.');
    });
  }, []);

  const toTitleCase = (str = "") =>
  str
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());



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
              { value: "cort", label: "Cort" },
              { value: "gm", label: "GM" },
              { value: "function", label: "Function" },
              { value: "test", label: "Test" },
            ]}
          />
        </Group>

        {/* ADD CORT BUTTON */}
        <Button leftSection={<Plus size={16} />} w={200}>
          Add Cort
        </Button>

        {/* MAIN TREE */}
        <Accordion
          variant="separated"
          multiple
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
          {mappingData?.map((cort) => (
  <Accordion.Item key={cort.cort_id} value={String(cort.cort_id)}>
    {/* CORT HEADER */}
    <Accordion.Control>
      <Group justify="space-between">
        <Stack gap={2}>
          <Group>
            <Text fw={600}>{toTitleCase(cort.cort_name)}</Text>
            <Badge color="blue">CORT</Badge>
          </Group>

          <Stack gap={0}>
            <Text size="xs" c="dimmed">
              Acronym: {cort.cort_acronym}
            </Text>

            <Text size="xs" c="dimmed">
              Hemisphere: {cort.cort_hemisphere === "l" ? "Left" : "Right"}
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

          <ActionIcon color="red" variant="light">
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
          Add GM
        </Button>

        {/* GM ACCORDION */}
        <Accordion multiple>
          {cort.gm?.map((gm) => (
            <Accordion.Item key={gm.gm_id} value={String(gm.gm_id)}>
              <Accordion.Control>
                <Card withBorder radius="md" bg="cyan.0">
                  <Group justify="space-between">
                    <Stack gap={2}>
                      <Group>
                        <Text fw={500}>{toTitleCase(gm.gm_name)}</Text>
                        <Badge color="cyan">GM</Badge>
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
                        onClick={(e) => e.stopPropagation()}
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
                  <Accordion multiple>
                    {gm.function?.map((func) => (
                      <Accordion.Item
                        key={func.function_id}
                        value={String(func.function_id)}
                      >
                        <Accordion.Control>
                          <Card withBorder radius="md" bg="green.0">
                            <Group justify="space-between">
                              <Stack gap={2}>
                                <Group>
                                  <Text fw={500}>{toTitleCase(func.function_name)}</Text>
                                  <Badge color="green">Function</Badge>
                                </Group>

                                {func.function_description && (
                                  <Text size="sm" c="dimmed">
                                    {func.function_description}
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
                                  onClick={(e) => e.stopPropagation()}
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
                              leftSection={<Plus size={14} />}
                              w="fit-content"
                            >
                              Add Test
                            </Button>

                            {/* TEST LIST */}
                            <Box pl="lg" style={{ maxWidth: "97%" }}>
                              {func.test?.map((test) => (
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
                                        <Text>{toTitleCase(test.test_name)}</Text>
                                        <Badge color="violet">Test</Badge>
                                      </Group>

                                      {test.test_description && (
                                        <Text size="sm" c="dimmed">
                                          {test.test_description}
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
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Trash2 size={14} />
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
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
    </Accordion.Panel>
  </Accordion.Item>
))}

        </Accordion>
      </Stack>
    </Container>
  );
}
