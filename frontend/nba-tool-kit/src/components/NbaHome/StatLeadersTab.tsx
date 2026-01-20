import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Box,
  Button,
  ButtonGroup,
  Heading,
  HStack,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Image,
  Select,
  Spacer,
} from "@chakra-ui/react";

type Leader = {
  rank: number;
  playerId: number | null;
  name: string;
  teamId: number | null;
  teamAbbr: string | null;
  value: number | null;
  gp: number | null;
};

type CardOption = {
  key: string;
  label: string;
  format: "1dp" | "0dp" | "pct";
};

type LeadersByOption = {
  leader: Leader | null;
  top: Leader[];
};

type LeaderCardGrouped = {
  cardKey: string;
  title: string;
  options: CardOption[];
  defaultOptionKey: string;
  leadersByOption: Record<string, LeadersByOption>;
};

type LeadersResponse = {
  minGp: number;
  limit: number;
  cards: LeaderCardGrouped[];
};

function formatValue(v: number | null | undefined, fmt: CardOption["format"]) {
  if (v === null || v === undefined) return "—";
  if (fmt === "pct") return `${v.toFixed(1)}%`;
  if (fmt === "0dp") return `${Math.round(v)}`;
  return v.toFixed(1);
}

function getHeadshotUrl(playerId: number | null | undefined) {
  if (!playerId) return "";
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`;
}

function getDefaultSelectionMap(cards: LeaderCardGrouped[]) {
  const map: Record<string, string> = {};
  for (const c of cards) map[c.cardKey] = c.defaultOptionKey;
  return map;
}

export default function StatLeadersTab() {
  const [minGp, setMinGp] = useState<number>(10);
  const [data, setData] = useState<LeadersResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // per-card option selection
  const [selectedOption, setSelectedOption] = useState<Record<string, string>>(
    {}
  );

  const apiBase = useMemo(() => "http://localhost:5000", []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    axios
      .get<LeadersResponse>(`${apiBase}/api/leaders`, {
        params: { min_gp: minGp, limit: 5 },
      })
      .then((r) => {
        if (!mounted) return;
        setData(r.data);

        // initialize option selections when data arrives
        setSelectedOption((prev) => {
          // if we already have selections, keep them
          if (Object.keys(prev).length > 0) return prev;
          return getDefaultSelectionMap(r.data.cards ?? []);
        });
      })
      .catch(() => {
        if (!mounted) return;
        setData({ minGp, limit: 5, cards: [] });
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [apiBase, minGp]);

  return (
    <Stack spacing={4}>
      <HStack justify="space-between" wrap="wrap" gap={3}>
        <Heading size="md">League Leaders</Heading>

        <HStack gap={3} wrap="wrap">
          <ButtonGroup isAttached size="sm" variant="outline">
            <Button onClick={() => setMinGp(5)} isActive={minGp === 5}>
              Min GP 5
            </Button>
            <Button onClick={() => setMinGp(10)} isActive={minGp === 10}>
              Min GP 10
            </Button>
            <Button onClick={() => setMinGp(20)} isActive={minGp === 20}>
              Min GP 20
            </Button>
          </ButtonGroup>
        </HStack>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {(loading ? Array.from({ length: 9 }) : data?.cards ?? []).map(
          (card, idx) => {
            const isSkeleton = loading;
            const c = card as LeaderCardGrouped | undefined;

            const cardKey = c?.cardKey ?? `sk-${idx}`;
            const title = isSkeleton ? "Loading…" : c?.title ?? "—";

            const options = c?.options ?? [];
            const currentOptionKey =
              selectedOption[cardKey] ??
              c?.defaultOptionKey ??
              options?.[0]?.key;

            const currentOption =
              options.find((o) => o.key === currentOptionKey) ?? options?.[0];

            const leaders =
              !isSkeleton && c && currentOptionKey
                ? c.leadersByOption?.[currentOptionKey]
                : undefined;

            const leader = leaders?.leader ?? null;
            const topRows = leaders?.top ?? [];

            const leaderName = isSkeleton ? "—" : leader?.name ?? "—";
            const leaderTeam = isSkeleton
              ? ""
              : leader?.teamAbbr
              ? ` (${leader.teamAbbr})`
              : "";

            const leaderValue = isSkeleton
              ? "—"
              : formatValue(leader?.value, currentOption?.format ?? "1dp");

            const rows = isSkeleton ? Array.from({ length: 5 }) : topRows;

            const showSelect = (c?.options?.length ?? 0) >= 4;

            return (
              <Box
                key={cardKey}
                bg="gray.800"
                borderRadius="lg"
                p={4}
                borderWidth="1px"
                borderColor="whiteAlpha.200"
              >
                <HStack align="center" spacing={3}>
                  <Skeleton isLoaded={!isSkeleton}>
                    <Text fontSize="sm" color="whiteAlpha.700">
                      {title}
                    </Text>
                  </Skeleton>

                  <Spacer />

                  {/* Per-card option control */}
                  <Skeleton isLoaded={!isSkeleton}>
                    {showSelect ? (
                      <Select
                        size="xs"
                        maxW="140px"
                        value={currentOptionKey}
                        onChange={(e) =>
                          setSelectedOption((prev) => ({
                            ...prev,
                            [cardKey]: e.target.value,
                          }))
                        }
                      >
                        {options.map((o) => (
                          <option key={o.key} value={o.key}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <ButtonGroup isAttached size="xs" variant="outline">
                        {options.map((o) => (
                          <Button
                            key={o.key}
                            isActive={o.key === currentOptionKey}
                            onClick={() =>
                              setSelectedOption((prev) => ({
                                ...prev,
                                [cardKey]: o.key,
                              }))
                            }
                          >
                            {o.label}
                          </Button>
                        ))}
                      </ButtonGroup>
                    )}
                  </Skeleton>
                </HStack>

                <Skeleton isLoaded={!isSkeleton} mt={2}>
                  <HStack justify="space-between" align="center" spacing={3}>
                    <HStack spacing={3}>
                      {!isSkeleton && leader?.playerId ? (
                        <Image
                          src={getHeadshotUrl(leader.playerId)}
                          alt={leader.name ?? "Leader"}
                          boxSize="52px"
                          objectFit="cover"
                          borderRadius="md"
                          border="1px solid"
                          borderColor="whiteAlpha.200"
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      ) : null}

                      <Box>
                        <Text fontWeight="bold" fontSize="lg" lineHeight="1.1">
                          {leaderName}
                          <Text
                            as="span"
                            color="whiteAlpha.600"
                            fontWeight="normal"
                          >
                            {leaderTeam}
                          </Text>
                        </Text>
                      </Box>
                    </HStack>

                    <Text fontWeight="bold">{leaderValue}</Text>
                  </HStack>
                </Skeleton>

                <Stack mt={3} spacing={1}>
                  {rows.map((row, i) => {
                    if (isSkeleton) {
                      return (
                        <Skeleton key={`row-${idx}-${i}`} isLoaded={false}>
                          <HStack justify="space-between" fontSize="sm">
                            <Text>—</Text>
                            <Text>—</Text>
                          </HStack>
                        </Skeleton>
                      );
                    }

                    const r = row as Leader;
                    return (
                      <HStack
                        key={`${cardKey}-${currentOptionKey}-${r.rank}`}
                        justify="space-between"
                        fontSize="sm"
                      >
                        <Text color="whiteAlpha.800">
                          {r.rank}. {r.name}
                          {r.teamAbbr ? (
                            <Text as="span" color="whiteAlpha.600">
                              {" "}
                              ({r.teamAbbr})
                            </Text>
                          ) : null}
                        </Text>
                        <Text color="whiteAlpha.900" fontWeight="semibold">
                          {formatValue(r.value, currentOption?.format ?? "1dp")}
                        </Text>
                      </HStack>
                    );
                  })}
                </Stack>
              </Box>
            );
          }
        )}
      </SimpleGrid>
    </Stack>
  );
}
