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
- For This machine: an account that can use `sudo`. `deploy.py`
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

### CI builds

The `Telematics Deploy package` workflow (`.github/workflows/deb-package.yml`)
builds the .deb for every pull request and every push to `develop`, `master`
and `release/*`. Download it from the run's summary page under **Artifacts**
(`telematics-deploy-deb`, a zip holding the .deb); it expires after the repo's
artifact retention period. For a tag on `master`, the .deb is also attached to
the tag's GitHub Release, where it is kept.

Pushes to `develop` and `release/*`, and tags on `master`, are also published to
the STOL apt repository for Ubuntu 22.04 (`jammy`) and 24.04 (`noble`):

| Build | apt codename |
| --- | --- |
| `develop` | `develop` |
| `release/<name>` (release candidate) | `release-<name>` |
| Tag on `master` (release) | `main` |

To install from it, for example the release on 24.04:

```bash
echo "deb [trusted=yes] http://s3.amazonaws.com/stol-apt-repository main noble" \
  | sudo tee /etc/apt/sources.list.d/stol-apt-repository.list
sudo apt update
sudo apt install telematics-deploy
```

Branch builds are versioned `<version>-<date>.git<count>.<sha>`; tag builds use
`<version>` alone, which sorts below the branch builds of that version. Raise
`version` before tagging, or installing the release over a branch build is a
downgrade.

### What users need

- Ubuntu 22.04 or newer with a desktop session, Python 3.9 or newer
- To install, double-click the .deb (App Center may warn that a downloaded
  package could be unsafe), or run
  `sudo apt install ./telematics-deploy-<version>-amd64.deb`. It pulls in
  `python3` and `sudo`, and adds Telematics Deploy to the app menu.

## Configuring Deployment

| Form | deploy.py argument |
| --- | --- |
| Deployment Mode: This machine | `--target localhost` |
| Deployment Mode: Cloud (AWS) | `--target cloud`, plus `--aws-region=<region> --centralized --key-path=<file>` when `deploy.py` lists its cloud options |
| (always) | `--environment prod --use-case all` (All Services: Core + RSU Management Services) |
| (always) | `--no-volume-prune`, when `deploy.py` lists `--volume-prune`, so a run keeps the stack's existing data |

For example, This machine runs:

```bash
./deployment/scripts/deploy.py --environment prod --target localhost --use-case all --no-volume-prune
```

After a successful run, the result page shows the
MySQL root password (`mysql_root_password.txt`) and the InfluxDB access token
(the `token` field of `influx_admin_token.txt`) from those files. They are
shown on screen only, never in Copy output or the saved settings.

### Cloud

The AWS fields appear only when `deploy.py --list-options` lists `--aws-region`
and `--key-path`.

- **Region** defaults to the script's `--aws-region` default.
- **Single server:** every cloud run sends `--centralized` (one m5n.8xlarge).
  The instance type in the confirmation comes from `electron/cliOptions.js`,
  and `test/cliOptions.test.js` fails if it stops matching `deploy.py`.
- **AWS credentials:** cloud runs always use the `default` profile. Add
  credentials writes it to `~/.aws/credentials` (mode 600); Edit keys replaces
  its access keys and leaves the rest of the file as it was.
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
| `electron/awsCredentials.js` | Checks the default AWS profile for the cloud target, and adds it or replaces its access keys |
| `electron/settings.js` | Saved settings in `~/.config/Telematics Deploy/`: non-secret fields per deployment mode (`targets.json`) and saved servers (`servers.json`) |
| `electron/serverConnection.js` | Validates server addresses and checks that a server responds |
| `electron/telematicsView.js` | The sandboxed view that shows a server's pages, and its navigation rules |
| `electron/signInQueue.js` | Queues HTTP authentication challenges from the view for the sign-in dialog |
| `electron/sudoPassword.js` | Checks the administrator password and serves it to `askpass.py` during a localhost run |
| `electron/askpass.py` | Hands that password to sudo and Ansible |
| `electron/bundle.js` | Installs and updates the packaged app's copy of the deployment files |
| `scripts/stage-bundle.mjs` | Stages those files for packaging |
| `src/` | React screens: start screen, configure form, AWS credentials dialog, result page, server screen, the strip above a server's pages, and the sign-in dialog |
