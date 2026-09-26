// Vitest setup: `server-only` throws outside a React Server environment, so stub it for unit tests.
import { vi } from "vitest";
vi.mock("server-only", () => ({}));
