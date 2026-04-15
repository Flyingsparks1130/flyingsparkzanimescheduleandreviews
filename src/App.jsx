import React, { useMemo, useState } from "react";
import { CalendarDays, Search, RefreshCw, CheckCircle2, Clock3, Sparkles, ListChecks, CloudCog, BellRing } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

const mockShows = [
  {
    id: 1,
    title: "The Angel Next Door Spoils Me Rotten Season 2",
    titleJp: "お隣の天使様にいつの間にか駄目人間にされていた件 2期",
    season: "Spring 2026",
    premiereDate: "2026-04-03",
    broadcast: "Fridays · 10:30 PM JST",
    episodes: 13,
    duration: 23,
    status: "planned",
    upcoming: true,
    selected: true,
    synced: false,
    image: "https://placehold.co/320x450?text=Anime+Poster",
    confidence: "High match",
  },
  {
    id: 2,
    title: "Sousou no Frieren Season 2",
    titleJp: "葬送のフリーレン 第2期",
    season: "Fall 2026",
    premiereDate: "2026-10-10",
    broadcast: "Saturdays · 11:00 PM JST",
    episodes: 24,
    duration: 24,
    status: "planned",
    upcoming: true,
    selected: true,
    synced: true,
    image: "https://placehold.co/320x450?text=Anime+Poster",
    confidence: "High match",
  },
  {
    id: 3,
    title: "Dandadan Season 2",
    titleJp: "ダンダダン 第2期",
    season: "Summer 2026",
    premiereDate: "2026-07-04",
    broadcast: "Thursdays · 12:00 AM JST",
    episodes: 12,
    duration: 24,
    status: "planned",
    upcoming: true,
    selected: false,
    synced: false,
    image: "https://placehold.co/320x450?text=Anime+Poster",
    confidence: "Needs review",
  },
  {
    id: 4,
    title: "Blue Box Season 2",
    titleJp: "アオのハコ 第2期",
    season: "Winter 2027",
    premiereDate: "2027-01-09",
    broadcast: "Fridays · 11:30 PM JST",
    episodes: 12,
    duration: 24,
    status: "planned",
    upcoming: true,
    selected: false,
    synced: false,
    image: "https://placehold.co/320x450?text=Anime+Poster",
    confidence: "High match",
  },
];

function Pill({ children }) {
  return <Badge className="rounded-full px-3 py-1 text-xs">{children}</Badge>;
}

function StatCard({ icon: Icon, label, value, subtext }) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{subtext}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3">
            <Icon className="h-5 w-5 text-slate-700" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnimeCalendarSyncUI() {
  const [shows, setShows] = useState(mockShows);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("upcoming");

  const filtered = useMemo(() => {
    return shows.filter((show) => {
      const matchesQuery =
        show.title.toLowerCase().includes(query.toLowerCase()) ||
        show.titleJp.toLowerCase().includes(query.toLowerCase()) ||
        show.season.toLowerCase().includes(query.toLowerCase());

      const matchesTab =
        tab === "all"
          ? true
          : tab === "selected"
          ? show.selected
          : tab === "synced"
          ? show.synced
          : show.upcoming;

      return matchesQuery && matchesTab;
    });
  }, [shows, query, tab]);

  const selectedCount = shows.filter((s) => s.selected).length;
  const syncedCount = shows.filter((s) => s.synced).length;
  const queueCount = shows.filter((s) => s.selected && !s.synced).length;

  const toggleSelected = (id) => {
    setShows((prev) =>
      prev.map((show) =>
        show.id === id ? { ...show, selected: !show.selected } : show
      )
    );
  };

  const markSelectedSynced = () => {
    setShows((prev) =>
      prev.map((show) =>
        show.selected ? { ...show, synced: true } : show
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[28px] border-0 shadow-sm">
              <CardContent className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-7 text-white md:p-9">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                  <div className="max-w-2xl">
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Pill>Jikan planned list</Pill>
                      <Pill>Upcoming anime</Pill>
                      <Pill>Google Calendar sync</Pill>
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                      Anime Calendar Sync
                    </h1>
                    <p className="mt-3 max-w-xl text-sm text-slate-300 md:text-base">
                      A GitHub Pages control panel for pulling future shows from your planned list,
                      reviewing matches, and syncing selected series into Google Calendar.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button className="rounded-2xl bg-white text-slate-900 hover:bg-slate-100">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh from Jikan
                    </Button>
                    <Button className="rounded-2xl bg-blue-500 text-white hover:bg-blue-600" onClick={markSelectedSynced}>
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Sync selected
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <StatCard
                icon={ListChecks}
                label="Shows selected"
                value={selectedCount}
                subtext="Currently queued for sync"
              />
              <StatCard
                icon={CalendarDays}
                label="Already synced"
                value={syncedCount}
                subtext="Mapped into Google Calendar"
              />
              <StatCard
                icon={Clock3}
                label="Pending jobs"
                value={queueCount}
                subtext="Ready for backend processing"
              />
            </div>

            <Card className="rounded-[28px] border-0 shadow-sm">
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search title, JP title, or season"
                      className="rounded-2xl border-slate-200 bg-white pl-10"
                    />
                  </div>

                  <Tabs value={tab} onValueChange={setTab} className="w-full md:w-auto">
                    <TabsList className="grid w-full grid-cols-4 rounded-2xl bg-slate-100 md:w-[420px]">
                      <TabsTrigger value="upcoming" className="rounded-2xl">Upcoming</TabsTrigger>
                      <TabsTrigger value="selected" className="rounded-2xl">Selected</TabsTrigger>
                      <TabsTrigger value="synced" className="rounded-2xl">Synced</TabsTrigger>
                      <TabsTrigger value="all" className="rounded-2xl">All</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((show) => (
                <Card key={show.id} className="overflow-hidden rounded-[28px] border-0 shadow-sm">
                  <div className="aspect-[16/9] w-full bg-slate-100">
                    <img src={show.image} alt={show.title} className="h-full w-full object-cover" />
                  </div>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-lg leading-tight">{show.title}</CardTitle>
                        <CardDescription className="mt-2 text-sm leading-5">
                          {show.titleJp}
                        </CardDescription>
                      </div>
                      {show.synced ? (
                        <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          Synced
                        </Badge>
                      ) : (
                        <Badge className="rounded-full bg-amber-100 text-amber-700 hover:bg-amber-100">
                          Not synced
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pb-5">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Pill>{show.season}</Pill>
                      <Pill>{show.episodes} eps</Pill>
                      <Pill>{show.duration} min</Pill>
                      <Pill>{show.confidence}</Pill>
                    </div>

                    <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Premiere</span>
                        <span className="font-medium">{show.premiereDate}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">Broadcast</span>
                        <span className="font-medium">{show.broadcast}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-500">List status</span>
                        <span className="font-medium capitalize">{show.status}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                      <div>
                        <p className="text-sm font-medium">Sync this show</p>
                        <p className="text-xs text-slate-500">Include in the next calendar update</p>
                      </div>
                      <Switch checked={show.selected} onCheckedChange={() => toggleSelected(show.id)} />
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" className="flex-1 rounded-2xl border-slate-200">
                        View details
                      </Button>
                      <Button className="flex-1 rounded-2xl bg-slate-900 text-white hover:bg-slate-800">
                        Queue sync
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="rounded-[28px] border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <CloudCog className="h-5 w-5" />
                  Backend status
                </CardTitle>
                <CardDescription>
                  First-pass view of your sync pipeline from planned list to Google Calendar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Last Jikan refresh</span>
                    <span className="font-medium">2 min ago</span>
                  </div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Last calendar sync</span>
                    <span className="font-medium">Today · 9:12 PM</span>
                  </div>
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-slate-500">Google auth</span>
                    <span className="font-medium text-emerald-600">Connected</span>
                  </div>
                  <Progress value={72} className="h-2" />
                  <p className="mt-2 text-xs text-slate-500">72% of selected shows have active calendar entries.</p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-emerald-100 p-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Frieren Season 2 synced</p>
                        <p className="text-xs text-slate-500">24 episode placeholders created in Google Calendar</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-amber-100 p-2">
                        <BellRing className="h-4 w-4 text-amber-700" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Dandadan needs review</p>
                        <p className="text-xs text-slate-500">Broadcast time confidence is low. Confirm before auto-creating events.</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl bg-sky-100 p-2">
                        <Sparkles className="h-4 w-4 text-sky-700" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Auto-select rule enabled</p>
                        <p className="text-xs text-slate-500">Upcoming planned shows are pre-selected when the premiere date exists.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">Suggested flow</CardTitle>
                <CardDescription>
                  Clean first pass for your GitHub Pages plus backend setup.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-medium text-slate-900">1. Pull planned list</p>
                    <p className="mt-1">Backend reads your planned anime list and filters to future or not-yet-aired titles.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-medium text-slate-900">2. Review upcoming titles</p>
                    <p className="mt-1">Frontend shows candidate matches, premiere dates, and sync confidence.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-medium text-slate-900">3. Queue calendar sync</p>
                    <p className="mt-1">Selected entries are sent to an API endpoint that creates or updates Google Calendar events.</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="font-medium text-slate-900">4. Reconcile changes later</p>
                    <p className="mt-1">A scheduled job can refresh premiere dates and repair mismatched events automatically.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
