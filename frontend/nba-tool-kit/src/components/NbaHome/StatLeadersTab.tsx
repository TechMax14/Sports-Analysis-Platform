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
} from "@chakra-ui/react";

type Mode = "perGame" | "totals";

type Leader = {
  rank: number;
  playerId: number | null;
  name: string;
  teamId: number | null;
  teamAbbr: string | null;
  value: number | null;
  gp: number | null;
};

type LeaderCard = {
  key: string;
  title: string;
  mode: Mode;
  format: "1dp" | "0dp" | "pct";
  leader: Leader | null;
  top: Leader[];
};

type LeadersResponse = {
  mode: Mode;
  minGp: number;
  limit: number;
  cards: LeaderCard[];
};

function formatValue(v: number | null | undefined, fmt: LeaderCard["format"]) {
  if (v === null || v === undefined) return "—";
  if (fmt === "pct") return `${v.toFixed(1)}%`;
  if (fmt === "0dp") return `${Math.round(v)}`;
  return v.toFixed(1);
}

function getHeadshotUrl(playerId: number | null | undefined) {
  if (!playerId) return "";
  return `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`;
}

export default function StatLeadersTab() {
  const [mode, setMode] = useState<Mode>("perGame");
  const [minGp, setMinGp] = useState<number>(10);
  const [data, setData] = useState<LeadersResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const apiBase = useMemo(() => "http://localhost:5000", []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    axios
      .get<LeadersResponse>(`${apiBase}/api/leaders`, {
        params: { mode, min_gp: minGp, limit: 5 },
      })
      .then((r) => {
        if (!mounted) return;
        setData(r.data);
      })
      .catch(() => {
        if (!mounted) return;
        setData({ mode, minGp, limit: 5, cards: [] });
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [apiBase, mode, minGp]);

  return (
    <Stack spacing={4}>
      <HStack justify="space-between" wrap="wrap" gap={3}>
        <Heading size="md">League Leaders</Heading>

        <HStack gap={3} wrap="wrap">
          <ButtonGroup isAttached size="sm" variant="outline">
            <Button
              onClick={() => setMode("perGame")}
              isActive={mode === "perGame"}
            >
              Per Game
            </Button>
            <Button
              onClick={() => setMode("totals")}
              isActive={mode === "totals"}
            >
              Totals
            </Button>
          </ButtonGroup>

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
            const c = card as LeaderCard | undefined;

            const title = isSkeleton ? "Loading…" : c?.title ?? "—";
            const leaderName = isSkeleton ? "—" : c?.leader?.name ?? "—";
            const leaderTeam = isSkeleton
              ? ""
              : c?.leader?.teamAbbr
              ? ` (${c.leader.teamAbbr})`
              : "";
            const leaderValue = isSkeleton
              ? "—"
              : formatValue(c?.leader?.value, c?.format ?? "1dp");

            const rows = isSkeleton ? Array.from({ length: 5 }) : c?.top ?? [];

            return (
              <Box
                key={isSkeleton ? `sk-${idx}` : c?.key ?? `card-${idx}`}
                bg="gray.800"
                borderRadius="lg"
                p={4}
                borderWidth="1px"
                borderColor="whiteAlpha.200"
              >
                <Skeleton isLoaded={!isSkeleton}>
                  <Text fontSize="sm" color="whiteAlpha.700">
                    {title}
                  </Text>
                </Skeleton>

                <Skeleton isLoaded={!isSkeleton} mt={2}>
                  <HStack justify="space-between" align="center" spacing={3}>
                    <HStack spacing={3}>
                      {!isSkeleton && c?.leader?.playerId ? (
                        <Image
                          src={getHeadshotUrl(c.leader.playerId)}
                          alt={c.leader.name ?? "Leader"}
                          boxSize="52px"
                          objectFit="cover"
                          borderRadius="md"
                          border="1px solid"
                          borderColor="whiteAlpha.200"
                          onError={(e) => {
                            // hide broken image gracefully
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      ) : null}

                      <Box>
                        <Text fontWeight="bold" fontSize="lg" lineHeight="1.1">
                          {c?.leader?.name ?? "—"}
                          {c?.leader?.teamAbbr ? (
                            <Text
                              as="span"
                              color="whiteAlpha.600"
                              fontWeight="normal"
                            >
                              {" "}
                              ({c.leader.teamAbbr})
                            </Text>
                          ) : null}
                        </Text>
                      </Box>
                    </HStack>

                    <Text fontWeight="bold">
                      {formatValue(c?.leader?.value, c?.format ?? "1dp")}
                    </Text>
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
                        key={`${c?.key}-${r.rank}`}
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
                          {formatValue(r.value, c?.format ?? "1dp")}
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
