# Telematics Deploy (desktop UI)

An Electron app with two paths, chosen on its start screen:

- **Deploy a new instance:** collects deployment inputs and runs
  `deployment/scripts/deploy.py` with them. It does not deploy anything itself:
  it builds the same command a user would type and shows the script's result.
- **Connect to an existing server:** checks that a Telematics server responds,
  then shows that server's own web UI in the app window.

## Requirements

- Ubuntu 22.04 or 24.04 with a desktop session
- Node.js 22.12 or newer (Electron 40 and later will not install on Node 20)
- Python 3.9 or newer (`python3` on `PATH`), as `deploy.py` needs. Ubuntu
  20.04 ships Python 3.8, which `deploy.py` does not run on.
- For the This machine target: an account that can use `sudo`. `deploy.py`
  installs Ansible with apt if it is missing.

## Run

```bash
cd deployment/ui
npm install
npm run dev     # Vite dev server + Electron, with live reload
npm start       # production build, then Electron
npm test        # CLI_Bridge unit tests
```

The app runs `deploy.py` from the repository that contains it. To point it at
another checkout, set `TELEMATICS_REPO_ROOT=/path/to/repo`.

## Configuring Deployment

| Form | deploy.py argument |
| --- | --- |
| Environment | `--environment dev\|test\|prod` |
| Target on-premise, This machine | `--target localhost` |
| Target on-premise, Remote host | `--target remote --remote-io=<host> --remote-user=<user>` and, if chosen, `--key-path=<file>` |
| Target cloud | `--target cloud`, plus `--aws-region=<region> --centralized\|--distributed --key-path=<file>` when `deploy.py` lists its cloud options |
| Use case | `--use-case all\|core\|rsu_integration` |
| Any secret override filled in | `--secret-overrides-stdin`, with the values as JSON on standard input |
| Keep existing data | `--no-volume-prune` |

For example, on-premise / This machine / dev / core runs:

```bash
./deployment/scripts/deploy.py --environment dev --target localhost --use-case core
```
The choices come from `deploy.py` itself.


### Secret overrides

The form has a password field for each key `deploy.py` lists for
`--secret-override`. An empty field uses its `.example` file. 

### Cloud

The AWS fields appear only when `deploy.py --list-options` lists `--aws-region`
and `--key-path`.

- **Region** defaults to the script's `--aws-region` default.
- **AWS profile** offers only `default` unless `deploy.py` lists
  `--aws-profile`. Then it lists every profile in the credentials and config
  files, including SSO and role profiles, and sends `--aws-profile=<name>`.
- **Topology** sends `--centralized` or `--distributed`; the labels name the
  instance types from `deploy.py`, which `electron/cliOptions.js` repeats.
- **SSH key for the instances** is required. Terraform registers it as the
  instances' key pair.

Before a cloud run, the app lists the AWS resources Terraform creates and
warns that they are billed until destroyed.

## Connecting to a server

The user enters the web UI's address (`10.0.0.5:8888` becomes
`http://10.0.0.5:8888/`) or picks a saved server. Then the
server's pages load in a view below the app's strip.

The app uses the scheme in the address, assumes `http://` if there is none, and
loads the final address if the server redirects. A bare address on a server that only accepts HTTPS and doesn't redirect will fail.

## Layout

| Path | Role |
| --- | --- |
| `electron/main.js` | Window, IPC handlers, app lifecycle |
| `electron/preload.js` | The only API the screens can call (`window.deployApi`) |
| `electron/cliBridge.js` | Validates the form, builds the arguments, runs `deploy.py`, parses its output |
| `electron/scriptOptions.js` | Reads the form's choices from `deploy.py --list-options` |
| `electron/cliOptions.js` | Labels for those choices, and the lists used when `deploy.py` cannot list them |
| `electron/awsCredentials.js` | Lists and checks AWS profiles for the cloud target, and adds the default profile |
| `electron/settings.js` | Saved settings in `~/.config/Telematics Deploy/`: non-secret target fields (`targets.json`) and saved servers (`servers.json`) |
| `electron/serverConnection.js` | Validates server addresses and checks that a server responds |
| `electron/telematicsView.js` | The sandboxed view that shows a server's pages, and its navigation rules |
| `electron/signInQueue.js` | Queues HTTP authentication challenges from the view for the sign-in dialog |
| `electron/sudoPassword.js` | Checks the administrator password and serves it to `askpass.py` during a localhost run |
| `electron/askpass.py` | Hands that password to sudo and Ansible |
| `src/` | React screens: start screen, configure form, AWS credentials dialog, result page, server screen, the strip above a server's pages, and the sign-in dialog |
