# Redux Toolkit

Predictable state for large teams and time-travel debugging. Redux Toolkit (RTK) pays off when **compliance**, **middleware ecosystems**, or **existing Redux investment** demand centralized reducers. For greenfield Expo SDK 57 apps, default to TanStack Query + Zustand unless an ADR mandates RTK.

Highlights / Redux Toolkit

* Adopt when audit trails, middleware, and DevTools are organizational requirements
* createSlice reduces Redux boilerplate - immer-powered reducers by default
* RTK Query is optional - prefer TanStack Query unless already on Redux
* configureStore sets up DevTools and thunk middleware in one call
* One slice per feature domain - avoid a single orders-and-ui-and-auth monolith
* Test reducers as pure functions; integration tests use mock store factory

## Recipe

> Quick-reference recipe card - copy-paste ready.

```bash
npx expo install @reduxjs/toolkit react-redux
```

```tsx
// src/app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import { cartSlice } from "@/features/cart/cartSlice";
import { checkoutSlice } from "@/features/checkout/checkoutSlice";
 
export const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
    checkout: checkoutSlice.reducer,
  },
  devTools: __DEV__,
});
 
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```tsx
// app/_layout.tsx
import { Provider } from "react-redux";
import { Stack } from "expo-router";
import { store } from "@/app/store";
 
export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack />
    </Provider>
  );
}
```

```tsx
// features/cart/cartSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
 
type CartItem = { productId: string; qty: number };
 
type CartState = { items: CartItem[] };
 
const initialState: CartState = { items: [] };
 
export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      state.items.push(action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
  },
});
 
export const { addItem, clearCart } = cartSlice.actions;
```

```tsx
// Typed hooks
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "@/app/store";
 
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

**When to reach for this:**

* **Regulated domains** need action logs and replay (fintech, healthcare workflows).
* **Multiple teams** already standardized on Redux patterns and training materials.
* **Middleware** requirements: analytics per action, crash breadcrumbs, offline queue integration.
* **RTK Query** is acceptable when **entire app** is on Redux - otherwise use TanStack Query.
* ADR explicitly ranks RTK over Zustand - see [ADR](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/).

## Working Example

```tsx
// checkoutSlice.ts - multi-step client workflow with explicit actions
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
 
type Step = "cart" | "shipping" | "payment" | "done";
 
type CheckoutState = {
  step: Step;
  shippingId: string | null;
  error: string | null;
};
 
const initialState: CheckoutState = {
  step: "cart",
  shippingId: null,
  error: null,
};
 
export const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<Step>) {
      state.step = action.payload;
      state.error = null;
    },
    selectShipping(state, action: PayloadAction<string>) {
      state.shippingId = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    resetCheckout() {
      return initialState;
    },
  },
});
 
export const { setStep, selectShipping, setError, resetCheckout } = checkoutSlice.actions;
```

```tsx
// CheckoutScreen.tsx - server shipping methods via TanStack Query; steps via Redux
import { useQuery } from "@tanstack/react-query";
import { Pressable, Text, View } from "react-native";
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { addItem, clearCart } from "@/features/cart/cartSlice";
import { resetCheckout, selectShipping, setStep } from "@/features/checkout/checkoutSlice";
 
function fetchShippingMethods() {
  return Promise.resolve([
    { id: "standard", label: "Standard" },
    { id: "express", label: "Express" },
  ]);
}
 
export function CheckoutScreen() {
  const dispatch = useAppDispatch();
  const step = useAppSelector((s) => s.checkout.step);
  const shippingId = useAppSelector((s) => s.checkout.shippingId);
  const cartCount = useAppSelector((s) => s.cart.items.length);
 
  const { data: methods = [] } = useQuery({
    queryKey: ["shipping-methods"],
    queryFn: fetchShippingMethods,
    enabled: step === "shipping",
  });
 
  return (
    <View style={{ padding: 16, gap: 8 }}>
      <Text>Step: {step}</Text>
      <Text>Cart items: {cartCount}</Text>
 
      {step === "cart" && (
        <Pressable
          onPress={() => {
            dispatch(addItem({ productId: "demo", qty: 1 }));
            dispatch(setStep("shipping"));
          }}
        >
          <Text>Continue to shipping</Text>
        </Pressable>
      )}
 
      {step === "shipping" &&
        methods.map((m) => (
          <Pressable
            key={m.id}
            onPress={() => {
              dispatch(selectShipping(m.id));
              dispatch(setStep("payment"));
            }}
          >
            <Text style={{ fontWeight: shippingId === m.id ? "700" : "400" }}>{m.label}</Text>
          </Pressable>
        ))}
 
      {step === "payment" && (
        <Pressable
          onPress={() => {
            dispatch(clearCart());
            dispatch(resetCheckout());
          }}
        >
          <Text>Pay (demo)</Text>
        </Pressable>
      )}
    </View>
  );
}
```

```tsx
// checkoutSlice.test.ts
import { checkoutSlice, setStep } from "./checkoutSlice";
 
test("setStep clears error", () => {
  const state = checkoutSlice.reducer(
    { step: "cart", shippingId: null, error: "fail" },
    setStep("shipping")
  );
  expect(state.step).toBe("shipping");
  expect(state.error).toBeNull();
});
```

**What this demonstrates:**

* **RTK slices** encode checkout transitions - auditable action names in DevTools.
* **TanStack Query** still owns **shipping methods** from API - not duplicated in Redux.
* **Typed hooks** prevent dispatching wrong action shapes.
* **Reducer tests** run without React - fast CI signal.
* **resetCheckout** returns initial state on completion - clear domain boundary.

## Deep Dive

### configureStore Defaults

`configureStore` adds:

* Redux Thunk middleware for async logic
* DevTools integration in development
* Immutability and serializability checks (warn in dev)

Disable noisy checks for persist actions if needed:

```tsx
middleware: (getDefaultMiddleware) =>
  getDefaultMiddleware({
    serializableCheck: { ignoredActions: ["persist/PERSIST"] },
  }),
```

### RTK Query (Optional)

If the org mandates Redux for all data:

```tsx
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
 
export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: "https://api.example.com" }),
  endpoints: (builder) => ({
    getOrders: builder.query<Order[], void>({ query: () => "/orders" }),
  }),
});
 
// store reducer: { [api.reducerPath]: api.reducer }
// middleware: getDefaultMiddleware().concat(api.middleware)
```

**Prefer TanStack Query** on new Expo apps unless RTK is already everywhere - two cache layers fight each other.

### Time-Travel Debugging

1. Run app in dev with Redux DevTools (Flipper plugin or remote debugger).
2. Dispatch actions - state tree updates per slice.
3. Jump to prior action - reproduce bug reports with exact sequence.

Critical for **audit** scenarios where support must replay user steps.

### Entity Adapter (Lists)

```tsx
import { createEntityAdapter, createSlice } from "@reduxjs/toolkit";
 
const ordersAdapter = createEntityAdapter<Order>();
 
const ordersSlice = createSlice({
  name: "orders",
  initialState: ordersAdapter.getInitialState(),
  reducers: {
    ordersLoaded: ordersAdapter.setAll,
    orderUpdated: ordersAdapter.updateOne,
  },
});
```

Still prefer Query for server lists unless offline middleware requires normalized Redux entities.

### Listener Middleware

React to actions without coupling slices:

```tsx
import { createListenerMiddleware } from "@reduxjs/toolkit";
 
const listenerMiddleware = createListenerMiddleware();
 
listenerMiddleware.startListening({
  actionCreator: clearCart,
  effect: async (_action, listenerApi) => {
    listenerApi.dispatch(resetCheckout());
  },
});
```

## Gotchas

* **Fetching in components into Redux on every mount** - Duplicates Query. **Fix:** Query for server; Redux for client workflow only.
* **Giant root reducer** - One slice file per feature. **Fix:** `combineReducers` via `configureStore` reducer map.
* **Non-serializable values in state** - `Date`, class instances break DevTools. **Fix:** Store ISO strings; map in selectors.
* **useSelector without equality fn** - Returning new objects re-renders often. **Fix:** Select primitives or use `shallowEqual`.
* **redux-persist with tokens in AsyncStorage** - Security review failure. **Fix:** Secure store for secrets; see persistence guide.
* **Installing RTK "just in case"** - Bundle and boilerplate tax. **Fix:** ADR before adoption.
* **Two server caches** - RTK Query + TanStack Query for same endpoints. **Fix:** Pick one.

## Alternatives

| Alternative | Use When | Don't Use When |
| --- | --- | --- |
| Redux Toolkit | Audit, middleware, team standards | Cart + theme only |
| Zustand | Lightweight global client state | Mandated action logs |
| TanStack Query | Server state (default) | Checkout step machine alone |
| useReducer + Context | Small shared UI | Cross-feature audited ledger |
| Event sourcing | Compliance immutable log | Typical consumer app |

## FAQs

RTK vs Zustand bundle size?

RTK + react-redux is larger than Zustand. Justified when DevTools and middleware are required - not for a badge counter.

Should new Expo apps start with Redux?

No - default Query + Zustand per [ADR Decision 10](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/). Adopt RTK when requirements appear.

RTK Query vs TanStack Query?

Feature parity is close. TanStack Query has stronger Expo/mobile docs in this site. RTK Query when reducers already own the app.

How do I type useSelector?

Export `RootState` from store; use `TypedUseSelectorHook<RootState>` - see recipe typed hooks.

Async thunks still?

`createAsyncThunk` works. Many teams use Query mutations instead of thunks for network - thunks for complex multi-slice orchestration.

Redux DevTools on physical device?

Use Flipper Redux plugin or remote JS debugging. Production builds disable DevTools via `devTools: __DEV__`.

How to test connected screens?

```tsx
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
 
const store = configureStore({ reducer: { cart: cartSlice.reducer } });
render(<Provider store={store}><CheckoutScreen /></Provider>);
```

Can slices live in feature folders?

Yes - `features/cart/cartSlice.ts` imported into `app/store.ts`. Keeps features modular.

Immer already inside createSlice?

Yes - mutate `state` in reducers; Immer produces immutable updates.

Logout sequence?

Dispatch `resetCheckout`, `clearCart`, and `api.util.resetApiState()` if using RTK Query; plus `queryClient.clear()` if TanStack Query coexists during migration.

Migrating from Redux to Zustand?

Slice-by-slice - move read-heavy UI to Query first, then client slices to Zustand. Run [refactoring checklist](https://docs.wahwei/reactnative.codeguides.io/architecture-design/refactoring-checklist/).

Expo Router with Redux?

Single `Provider` in `app/_layout.tsx`. Routes dispatch actions; avoid store imports in shared entity types.

## Related

* [Zustand](https://docs.wahwei/reactnative.codeguides.io/state-management/zustand/) - default lightweight global client store
* [TanStack Query](https://docs.wahwei/reactnative.codeguides.io/state-management/tanstack-query/) - preferred server cache
* [useState & useReducer](https://docs.wahwei/reactnative.codeguides.io/state-management/usestate-and-usereducer/) - local workflow before Redux
* [State Persistence & Hydration](https://docs.wahwei/reactnative.codeguides.io/state-management/state-persistence-and-hydration/) - redux-persist cautions
* [../architecture-design/adr-state-management-selection/adr-state-management-selection.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/adr-state-management-selection/) - when RTK ranks first
* [../architecture-design/refactoring-checklist/refactoring-checklist.md](https://docs.wahwei/reactnative.codeguides.io/architecture-design/refactoring-checklist/) - detect god stores

> **Stack versions:** This page was written for **React 19.2.3**, **React Native 0.86.0**, and **Expo SDK 57** (`expo` ~57.0.4). Y29kZWd1aWRlcy5pb3xjZ2lvOTEyfDIwMjYwNw==

Reviewed by Chris St. John·Last updated Jul 19, 2026
