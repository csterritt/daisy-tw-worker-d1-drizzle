#!/bin/bash
set -euo pipefail
sqlite-utils insert .wrangler/state/v3/d1/miniflare-D1DatabaseObject/a514711f8bc10f258a7b9292b4131ca3cb2970e09c9f377b3a348e6dbc0c3d67.sqlite account - --pk id < tmp/account_dump.json
sqlite-utils insert .wrangler/state/v3/d1/miniflare-D1DatabaseObject/a514711f8bc10f258a7b9292b4131ca3cb2970e09c9f377b3a348e6dbc0c3d67.sqlite user - --pk id < tmp/user_dump.json
