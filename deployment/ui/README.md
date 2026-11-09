# Telematics Deploy (desktop UI)

An Electron app with two paths, chosen on its start screen:

- **Deploy a new instance:** collects deployment inputs and runs
  `deployment/scripts/deploy.py` with them. It does not deploy anything itself:
  it builds the same command a user would type and shows the script's result.
- **Connect to an existing server:** checks that a Telematics server responds,
  then shows that server's own web UI in the app window.

## Requirements

- Ubuntu 22.04 or newer with a desktop session
- Node.js 22.12 or newer (Electron 40 and later will not install on Node 20)
- Python 3.9 or newer (`python3` on `PATH`), as `deploy.py` needs. Ubuntu
  20.04 ships Python 3.8, which `deploy.py` does not run on.
- For the on-premise target: an account that can use `sudo`. `deploy.py`
  installs Ansible with apt if it is missing.

## Run

```bash
cd deployment/ui
npm install
npm run dev     # Vite dev server + Electron, with live reload
npm start       # production build, then Electron
npm test        # CLI_Bridge unit tests
```

During development the app runs `deploy.py` from the repository that contains
it. To point it at another checkout, set `TELEMATICS_REPO_ROOT=/path/to/repo`.

## Packaging

```bash
sudo apt install binutils   # once: the .deb build needs `ar`
cd deployment/ui
npm install
npm run dist
```

`npm run dist` writes `release/telematics-deploy-<version>-amd64.deb`. Raise
`version` in `package.json` for each release.

The package carries their own copy of the deployment files: everything git
tracks under `deployment/` (except this app) and `telematic_system/`, staged by
`scripts/stage-bundle.mjs` into `build/bundle/`. Tracked files are taken from
the working tree, so commit first; the bundle's `manifest.json` records the
commit and whether there were uncommitted changes.

### What users need

- Ubuntu 22.04 or newer with a desktop session, Python 3.9 or newer
- To install, double-click the .deb (App Center may warn that a downloaded
  package could be unsafe), or run
  `sudo apt install ./telematics-deploy-<version>-amd64.deb`. It pulls in
  `python3` and `sudo`, and adds Telematics Deploy to the app menu.
- To update, install the newer .deb the same way. To remove it, use App
  Center or `sudo apt remove telematics-deploy`; the deployment files in
  `~/.local/share/telematics-deploy/` stay.

### Where the packaged app keeps its files

The app's own files are read-only, but `deploy.py` writes `.env`, secrets and
Terraform state next to its scripts. So on first start the packaged app copies
its bundled deployment files to `~/.local/share/telematics-deploy/` (or
`$XDG_DATA_HOME/telematics-deploy/`) and runs `deploy.py` there.

A newer version of the app replaces the bundled files there and removes those
it no longer ships. It never touches files `deploy.py` generated: `.env`,
`secrets/*.txt`, `terraform.tfstate`, `terraform.tfvars.json` and the
Terraform provider cache stay. Edits to bundled files in that folder are
overwritten by the next version. `TELEMATICS_REPO_ROOT` still points a packaged
app at a checkout instead.

`electron/askpass.py` is shipped outside the app's asar archive
(`asarUnpack`), because sudo and Ansible execute it.

## Configuring Deployment

| Form | deploy.py argument |
| --- | --- |
| Environment | `--environment dev\|test\|prod` |
| Target on-premise (this machine) | `--target localhost` |
| Target cloud | `--target cloud`, plus `--aws-region=<region> --centralized\|--distributed --key-path=<file>` when `deploy.py` lists its cloud options |
| Use case | `--use-case all\|core\|rsu_integration` |
| Any secret override filled in | `--secret-overrides-stdin`, with the values as JSON on standard input |
| Keep existing data | `--no-volume-prune` |

For example, on-premise / dev / core runs:

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
| `electron/bundle.js` | Installs and updates the packaged app's copy of the deployment files |
| `scripts/stage-bundle.mjs` | Stages those files for packaging |
| `src/` | React screens: start screen, configure form, AWS credentials dialog, result page, server screen, the strip above a server's pages, and the sign-in dialog |
