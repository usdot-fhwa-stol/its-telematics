--[[
  Copyright (C) 2019-2026 LEIDOS.

  Licensed under the Apache License, Version 2.0 (the "License"); you may not
  use this file except in compliance with the License. You may obtain a copy of
  the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
  WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
  License for the specific language governing permissions and limitations under
  the License.

  Grafana Auth Lua Script

  Validates JWT tokens for mobile Grafana access.
  Checks URL query parameter first, then cookie.
  Sets X-WEBAUTH-USER header via REMOTE_USER for Grafana auth proxy.
  Sets cookie after successful URL-based auth for subsequent requests.
]]

-- Base64 decoding table
local b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
local b64lookup = {}
for i = 1, #b64chars do
    b64lookup[b64chars:sub(i, i)] = i - 1
end

-- Base64 decode function (handles URL-safe base64)
local function base64_decode(data)
    if not data then return nil end

    -- Convert URL-safe base64 to standard base64
    data = data:gsub('-', '+'):gsub('_', '/')

    local padding = #data % 4
    if padding > 0 then
        data = data .. string.rep('=', 4 - padding)
    end

    local result = {}
    local bits = 0
    local bitcount = 0

    for i = 1, #data do
        local char = data:sub(i, i)
        if char == '=' then break end
        local val = b64lookup[char]
        if val then
            bits = bits * 64 + val
            bitcount = bitcount + 6
            if bitcount >= 8 then
                bitcount = bitcount - 8
                local byte = math.floor(bits / (2 ^ bitcount)) % 256
                table.insert(result, string.char(byte))
                bits = bits % (2 ^ bitcount)
            end
        end
    end

    return table.concat(result)
end

-- Extract query parameter from URL
local function get_query_param(r, name)
    local args = r.args
    if not args then return nil end

    for param in args:gmatch('[^&]+') do
        local key, value = param:match('^([^=]+)=(.*)$')
        if key == name then
            -- URL decode the value
            value = value:gsub('%%(%x%x)', function(hex)
                return string.char(tonumber(hex, 16))
            end)
            return value
        end
    end
    return nil
end

-- Extract cookie value
local function get_cookie(r, name)
    local cookies = r.headers_in['Cookie']
    if not cookies then return nil end

    for cookie in cookies:gmatch('[^;]+') do
        cookie = cookie:gsub('^%s+', ''):gsub('%s+$', '')
        local key, value = cookie:match('^([^=]+)=(.*)$')
        if key == name then
            return value
        end
    end
    return nil
end

-- Parse JWT and extract username from payload
local function parse_jwt(token)
    if not token then return nil end

    local parts = {}
    for part in token:gmatch('[^.]+') do
        table.insert(parts, part)
    end

    if #parts ~= 3 then
        return nil
    end

    -- Decode payload (second part)
    local payload_json = base64_decode(parts[2])
    if not payload_json then
        return nil
    end

    -- Extract username using pattern matching (simple JSON parsing)
    local username = payload_json:match('"username"%s*:%s*"([^"]+)"')

    -- Verify purpose field
    local purpose = payload_json:match('"purpose"%s*:%s*"([^"]+)"')
    if purpose ~= 'grafana_auth' then
        return nil
    end

    -- Check expiration (exp is Unix timestamp)
    local exp = payload_json:match('"exp"%s*:%s*(%d+)')
    if exp then
        local exp_time = tonumber(exp)
        local current_time = os.time()
        if current_time > exp_time then
            return nil  -- Token expired
        end
    end

    return username
end

-- Main authentication check function
-- Called by Apache via LuaHookAccessChecker
function grafana_auth_check(r)
    local token = get_query_param(r, 'grafana_auth')
    local from_url = token ~= nil

    -- If not in URL, check cookie
    if not token then
        token = get_cookie(r, 'grafana_auth')
    end

    -- If we have a token, validate it
    if token then
        local username = parse_jwt(token)
        if username then
            -- Set REMOTE_USER for Apache
            -- This is used by RewriteRule to set X-WEBAUTH-USER header
            r.user = username

            -- If auth came from URL, set cookie for subsequent requests
            -- (JS, CSS, images, API calls)
            if from_url then
                r.headers_out['Set-Cookie'] = 'grafana_auth=' .. token ..
                    '; Path=/grafana/; Max-Age=3600; HttpOnly; SameSite=Lax'
            end

            return apache2.OK
        end
    end

    return apache2.DECLINED
end
