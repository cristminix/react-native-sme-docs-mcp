# Container/Presenter on Mobile

The container/presenter split separates **data and side effects** (fetching, mutations, navigation, analytics) from **pure UI** (layout, styles, conditional rendering from props). On mobile, route screens usually act as containers while reusable list rows, sheets, and empty states stay presenters - which makes Jest tests and Storybook-style previews far cheaper than mounting full navigation trees.

Highlights / Container/Presenter on Mobile

* Containers own data, navigation side effects, and platform wiring
* Presenters are pure UI - props in, JSX out, easy to snapshot test
* Screens are often containers; shared lists and cards are presenters
* TanStack Query belongs in the container layer, not inside design-system atoms
* Co-locate container + presenter per feature before splitting across packages
* Expo Router route files are thin containers that delegate to feature presenters

## Recipe

> Quick-reference recipe card - copy-paste ready.

```tsx
import { useCallback } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
 
interface User {
  id: string;
  name: string;
}
 
interface UserListProps {
  users: User[];
  onSelect: (id: string) => void;
}
 
// Presenter - no fetch, no router, no global stores
export function UserList({ users, onSelect }: UserListProps) {
  return (
    <FlatList
      data={users}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable onPress={() => onSelect(item.id)}>
          <Text>{item.name}</Text>
        </Pressable>
      )}
    />
  );
}
 
// Container - wires data + navigation
export function UserListScreen() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });
 
  const handleSelect = useCallback((id: string) => {
    // router.push(`/users/${id}`);
  }, []);
 
  if (isPending) return <ActivityIndicator />;
  if (isError) return <Text>Failed to load users</Text>;
 
  return <UserList users={data ?? []} onSelect={handleSelect} />;
}
 
async function fetchUsers(): Promise<User[]> {
  const res = await fetch("https://example.com/api/users");
  if (!res.ok) throw new Error("Network error");
  return res.json();
}
```

**When to reach for this:**

* A screen mixes `useQuery`, `useRouter`, and 200 lines of JSX styling
* You want to snapshot-test UI states (loading, empty, error) without mocking fetch
* Designers iterate on layout while engineers stabilize data contracts
* The same list UI appears in a modal and a full screen with different data sources
* E2E tests should hit containers; unit tests should hit presenters

## Working Example

```tsx
import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
 
interface Project {
  id: string;
  name: string;
  status: "active" | "archived";
  openTasks: number;
}
 
type LoadState = "loading" | "error" | "empty" | "ready";
 
interface ProjectsPresenterProps {
  state: LoadState;
  projects: Project[];
  refreshing: boolean;
  errorMessage?: string;
  onRefresh: () => void;
  onPressProject: (id: string) => void;
}
 
export function ProjectsPresenter({
  state,
  projects,
  refreshing,
  errorMessage,
  onRefresh,
  onPressProject,
}: ProjectsPresenterProps) {
  if (state === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Loading projects…</Text>
      </View>
    );
  }
 
  if (state === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{errorMessage ?? "Something went wrong"}</Text>
        <Pressable onPress={onRefresh} style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
 
  if (state === "empty") {
    return (
      <View style={styles.center}>
        <Text style={styles.heading}>No projects yet</Text>
        <Text style={styles.muted}>Pull to refresh after your first sync.</Text>
      </View>
    );
  }
 
  return (
    <FlatList
      data={projects}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onPressProject(item.id)}
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{item.name}</Text>
            <Text
              style={[
                styles.badge,
                item.status === "archived" && styles.badgeMuted,
              ]}
            >
              {item.status}
            </Text>
          </View>
          <Text style={styles.meta}>{item.openTasks} open tasks</Text>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      contentContainerStyle={styles.list}
    />
  );
}
 
const MOCK_PROJECTS: Project[] = [
  { id: "p1", name: "Expo SDK 57 upgrade", status: "active", openTasks: 4 },
  { id: "p2", name: "Checkout redesign", status: "active", openTasks: 11 },
  { id: "p3", name: "Legacy billing", status: "archived", openTasks: 0 },
];
 
async function fetchProjects(): Promise<Project[]> {
  await new Promise((r) => setTimeout(r, 400));
  return MOCK_PROJECTS;
}
 
function toLoadState(
  isPending: boolean,
  isError: boolean,
  count: number
): LoadState {
  if (isPending) return "loading";
  if (isError) return "error";
  if (count === 0) return "empty";
  return "ready";
}
 
export default function ProjectsScreen() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });
 
  const projects = query.data ?? [];
  const state = toLoadState(query.isPending, query.isError, projects.length);
 
  const handleRefresh = useCallback(() => {
    void query.refetch();
  }, [query]);
 
  const handlePressProject = useCallback(
    (id: string) => {
      router.push(`/projects/${id}`);
    },
    [router]
  );
 
  return (
    <View style={styles.screen}>
      <ProjectsPresenter
        state={state}
        projects={projects}
        refreshing={query.isFetching && !query.isPending}
        errorMessage={query.error instanceof Error ? query.error.message : undefined}
        onRefresh={handleRefresh}
        onPressProject={handlePressProject}
      />
    </View>
  );
}
 
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  heading: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  muted: { fontSize: 15, color: "#64748b", textAlign: "center" },
  error: { fontSize: 15, color: "#dc2626", textAlign: "center" },
  button: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontWeight: "600" },
  list: { padding: 16 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 17, fontWeight: "600", color: "#0f172a", flex: 1 },
  badge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
    textTransform: "uppercase",
  },
  badgeMuted: { color: "#94a3b8" },
  meta: { fontSize: 14, color: "#475569" },
  separator: { height: 10 },
});
```

**What this demonstrates:**

* `ProjectsScreen` maps TanStack Query flags into a simple `LoadState` union for the presenter
* `ProjectsPresenter` handles every visual branch - loading, error, empty, list - with no fetch imports
* Navigation (`router.push`) stays in the container; the presenter only calls `onPressProject(id)`
* `RefreshControl` wiring lives in the presenter; the container supplies `onRefresh` tied to `refetch`
* Tests can render `ProjectsPresenter` with `state="empty"` without a `QueryClientProvider`

## Deep Dive

### How It Works

* **Container** (smart / screen component): subscribes to remote data, global stores, route params, and platform APIs; maps them to a **view model** passed as props.
* **Presenter** (dumb / pure component): renders JSX from props; avoids `useQuery`, `useRouter`, and implicit globals.
* The boundary is a **typed props interface** - that contract is what you snapshot-test and what design tools consume.
* Containers may call custom hooks (`useProjectsQuery`) to stay thin - hooks are not presenters.
* Expo Router files (`app/projects/index.tsx`) should default-export a container that imports a colocated presenter from `features/projects/`.
* Multiple containers can reuse one presenter when the UI is identical but data sources differ (search modal vs tab screen).

### Responsibility Split

| Concern | Container | Presenter |
| --- | --- | --- |
| `useQuery` / mutations | ✓ |  |
| `useRouter` / deep links | ✓ |  |
| Analytics events | ✓ (or hook called by container) |  |
| `StyleSheet` / layout | Optional shell | ✓ primary |
| Empty / error / loading UI | Maps flags to `state` prop | ✓ renders branches |
| `FlatList` performance | Passes stable callbacks | ✓ `memo` on rows |
| Form validation schema | ✓ loads defaults from API | ✓ shows field errors from props |

### Folder Layout on Mobile

```
features/
  projects/
    projects-screen.tsx          # container (default export for route)
    projects-presenter.tsx       # pure UI
    use-projects-query.ts        # optional data hook
    project-card.tsx             # smaller presenter
    __tests__/
      projects-presenter.test.tsx
app/
  projects/
    index.tsx                    # re-export ProjectsScreen
```

* Keep presenters next to their primary container - not in a distant `components/` dump.
* Share presenters across features only when the props contract is truly identical.
* Route files stay one line when possible: `export { default } from "@/features/projects/projects-screen";`

### View Model Props

```tsx
// Prefer explicit unions over many booleans
type ProjectsViewModel =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; projects: Project[]; refreshing: boolean };
 
interface ProjectsPresenterProps extends ProjectsViewModel {
  onRefresh: () => void;
  onPressProject: (id: string) => void;
}
```

* Discriminated unions make impossible states unrepresentable - no `isLoading && isError`.
* See [Typing Components & Props](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-components-and-props/) for union typing patterns.
* Callback props are always named `on*` and defined in the container with `useCallback`.

### TypeScript Notes

```tsx
// Presenter props document the full visual contract
interface ProjectCardProps {
  project: Project;
  onPress: (id: string) => void;
}
 
// Container maps API DTO → view model
function mapProjectDto(dto: ProjectDto): Project {
  return {
    id: dto.project_id,
    name: dto.display_name,
    status: dto.is_archived ? "archived" : "active",
    openTasks: dto.open_task_count,
  };
}
```

* Map snake\_case API fields before they reach presenters - UI types match design language.
* Export presenter props types for tests and Storybook-style harnesses.
* Route params typed via [Typing Navigation & Route Params](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-navigation-and-route-params/) stay in the container.

## Gotchas

* **Presenter sneaks in `useQuery`** - A "dumb" list that imports TanStack Query cannot render in isolation. **Fix:** Lift query to the container; pass `projects` and `state` down.
* **Leaky navigation in presenters** - `router.push` inside a card component couples UI to Expo Router. **Fix:** Pass `onPressProject`; let the container decide the route.
* **Boolean prop soup** - `isLoading`, `isError`, `hasData`, `isRefreshing` combos explode. **Fix:** Single discriminated `state` or `status` union prop.
* **Container still 800 lines of JSX** - Splitting the file but leaving all markup in the container defeats the pattern. **Fix:** Move visual branches to the presenter; container returns one JSX element.
* **Over-splitting tiny screens** - Two static labels do not need two files. **Fix:** Apply the split when fetch, navigation, or three+ UI states appear.
* **Unstable callback props** - Inline `onPress={() => router.push(...)}` in the container recreates each render. **Fix:** `useCallback` in the container so presenter children can `memo`.
* **Testing the container by default** - Mocking `QueryClient`, `expo-router`, and native modules in every test is slow. **Fix:** Test the presenter for UI; reserve one integration test per critical container path.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Container / presenter | Screens with network + several UI states | Static marketing page with no data |
| Custom hook + single component | Medium screens where file split feels heavy | Presenter reuse across modal and route |
| TanStack Query in presenter via HOC | Legacy migration only | Greenfield - explicit container is clearer |
| Server Components | N/A on RN today | - |
| MVVM with view models in hooks | Large teams formalize contracts | Small feature with one list |
| God screen (no split) | Prototype or throwaway | Long-lived production feature |

## FAQs

What is the difference between a container and a screen?

* On mobile, the **screen** is often the container - the file tied to a route.
* The **presenter** is usually not a route; it is imported by one or more containers.
* A screen can render multiple presenters (header + list + footer).

Can presenters use useState?

* **Ephemeral UI state** (expanded row, pressed chip) can live in presenters.
* **Server or route-derived state** belongs in containers.
* If modal open state triggers navigation, keep it in the container.

Where does TanStack Query go?

* In the container or a dedicated `useProjectsQuery` hook called by the container.
* Presenters receive mapped data and status - not raw `UseQueryResult`.
* Pull-to-refresh calls `refetch` in the container, passed as `onRefresh`.

How do I test a presenter without a device?

```tsx
import { render, screen } from "@testing-library/react-native";
import { ProjectsPresenter } from "../projects-presenter";
 
test("shows empty state", () => {
  render(
    <ProjectsPresenter
      state="empty"
      projects={[]}
      refreshing={false}
      onRefresh={jest.fn()}
      onPressProject={jest.fn()}
    />
  );
  expect(screen.getByText("No projects yet")).toBeTruthy();
});
```

* No `QueryClientProvider`, no router mock - only props.
* Snapshot the four `LoadState` branches for regression safety.

Gotcha: Presenter imports useRouter by accident?

* Any router hook forces tests to mock `expo-router`.
* Pass `onPress` callbacks from the container instead.
* Search the presenter for `expo-router`, `@tanstack`, and `zustand` - they should be absent.

How thin should an Expo Router route file be?

* Ideal: re-export the feature container - `export { default } from "@/features/projects/projects-screen";`
* Acceptable: tiny container when the route only adds `Stack.Screen` options.
* Avoid business logic in `app/` - keeps file-based routing a map, not a junk drawer.

Container/presenter vs hooks - what goes where?

* **Hook**: reusable data + effect logic (`useProjectsQuery`).
* **Container**: composes hooks, router, analytics; maps to view props.
* **Presenter**: renders props; may use small local UI state.
* See [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/) for UI-only hooks in presenters.

Should error boundaries wrap container or presenter?

* Wrap at the **container / route** level so the whole screen can fall back.
* Presenters can render inline error UI when `state="error"` - that is expected data failure, not a render crash.
* Use React error boundaries for unexpected throws in either layer.

How do I share a presenter between a modal and a screen?

* Export the same `ProjectsPresenter` from `features/projects/`.
* `ProjectsModalContainer` and `ProjectsScreen` differ only in data source and `onPress` routing.
* Modals still benefit from the split - test the presenter once.

Gotcha: Mapping query flags wrong?

* `isFetching` is true during background refresh - not the same as initial `isPending`.
* Pass `refreshing={isFetching && !isPending}` to `RefreshControl`.
* Initial load should not show the pull spinner and the full-screen loader simultaneously.

Is this the same as atomic design?

* Presenters overlap with **molecules/organisms** but the split is about **data boundaries**, not size.
* A large presenter is fine if it stays prop-driven.
* Containers map domain data; atoms stay style-only.

How does this help performance?

* Presenters wrapped in `memo` re-render only when view props change.
* Containers isolate query subscription churn from deep presenter subtrees when props are stable.
* Pair with guidance in [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/).

Can generated API clients live in presenters?

* No - keep OpenAPI/Zod parsing in the container or a `api/` module.
* Presenters receive already-validated view models.
* See [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/).

When is one file enough?

* Read-only UI with no network and no navigation side effects.
* Prototypes exploring layout before the data contract exists.
* Split once you add the second state branch (error/empty) or second consumer.

## Related

* [Component Patterns Basics](https://docs.wahwei/reactnative.codeguides.io/component-patterns/component-patterns-basics/) - screen vs presentational conventions
* [Custom Hooks for UI Logic](https://docs.wahwei/reactnative.codeguides.io/component-patterns/custom-hooks-for-ui-logic/) - hooks containers call before passing props
* [Render Props & Slot Patterns](https://docs.wahwei/reactnative.codeguides.io/component-patterns/render-props-and-slot-patterns/) - optional handoff from container to presenter
* [Anti-Patterns: God Screens](https://docs.wahwei/reactnative.codeguides.io/component-patterns/anti-patterns-god-screens/) - when the split was skipped too long
* [Typing API Responses & Zod](https://docs.wahwei/reactnative.codeguides.io/typescript-rn/typing-api-responses-and-zod/) - validate in the container layer
* [Props, State & Re-renders on Mobile](https://docs.wahwei/reactnative.codeguides.io/rn-fundamentals/props-state-and-re-renders-on-mobile/) - stabilize presenter props

### External Related Links

* [react.dev](https://react.dev/) - core React concepts RN builds on
* [reactnative.dev](https://reactnative.dev/) - official React Native site
* [galaxies.dev](https://galaxies.dev/) - structured RN/Expo courses (Simon Grimm)

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4).

Reviewed by Chris St. John·Last updated Jul 16, 2026
