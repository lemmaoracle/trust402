#!/usr/bin/env node
/**
 * Server entry point for the Trust402 demo resource.
 * Starts the Hono app on the configured port.
 */

import { serve } from "@hono/node-server";
import { app, start, PORT } from "./index.js";

start();
serve({ fetch: app.fetch, port: PORT });
