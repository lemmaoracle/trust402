#!/usr/bin/env node
/**
 * Server entry point for the Trust402 demo resource.
 * Starts the Hono app on the configured port.
 */

import { config } from "dotenv";
import * as path from "node:path";
import { serve } from "@hono/node-server";
import { app, start, PORT } from "./index.js";

config({ path: path.resolve(import.meta.dirname, "..", "..", "..", "..", ".env") });

start();
serve({ fetch: app.fetch, port: PORT });
