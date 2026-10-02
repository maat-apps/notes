import { lazy } from "react";
import { BrowserRouter, Route, Routes } from "react-router";

import { AppLockGate } from "../components/app-lock-gate";

const HomeView = lazy(() =>
  import("../views/home/home-view").then((m) => ({ default: m.HomeView })),
);
const NoteView = lazy(() =>
  import("../views/note/note-view").then((m) => ({ default: m.NoteView })),
);
const NewNoteView = lazy(() =>
  import("../views/note/note-view").then((m) => ({ default: m.NewNoteView })),
);

export function AppRouter() {
  return (
    <AppLockGate>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/new/:type" element={<NewNoteView />} />
          <Route path="/:id" element={<NoteView />} />
        </Routes>
      </BrowserRouter>
    </AppLockGate>
  );
}
