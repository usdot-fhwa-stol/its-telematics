import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RegisterRSUDialog from "../../../components/rsu_management/rsu-status/components/RegisterRSUDialog";
import { useTRUConfig } from "../../../context/tru-config-context";
import { useTRUStatus } from "../../../context/tru-status-context";

jest.mock("../../../context/tru-config-context");
jest.mock("../../../context/tru-status-context");

const mockBuildTruConfigMessage = jest.fn();
const mockRegisterRSU = jest.fn();
const mockRefresh = jest.fn();

const mockTRUStatuses = [
  {
    unitConfig: {
      unitId: "TRU-001",
      name: "TRU 1",
      maxConnections: 5
    },
    pluginConfigStatus: {
      bridgePluginStatus: "running"
    },
    rsuConfigs: [{ rsu: { ip: "192.168.1.10", port: 1516 } }]
  }
];

const renderDialog = (props = {}) => {
  const onClose = jest.fn();
  const onSuccess = jest.fn();

  render(
    <RegisterRSUDialog
      open={true}
      onClose={onClose}
      onSuccess={onSuccess}
      {...props}
    />
  );

  return { onClose, onSuccess };
};

const selectOptionByIndex = async (index, optionText) => {
  const select = screen.getAllByRole("combobox")[index];
  fireEvent.mouseDown(select);
  const option = await screen.findByRole("option", { name: optionText });
  fireEvent.click(option);
};

const fillRequiredSubmitFields = async (overrides = {}) => {
  fireEvent.change(screen.getByLabelText(/IP Address/i), {
    target: { value: overrides.ip ?? "192.168.1.100" }
  });
  fireEvent.change(screen.getByLabelText(/Port/i), {
    target: { value: overrides.port ?? "1516" }
  });
  fireEvent.change(screen.getByLabelText(/Event Name/i), {
    target: { value: overrides.event ?? "register_event-1" }
  });

  const userFields = screen.getAllByLabelText(/User/i);
  const userField = userFields[userFields.length - 1];
  fireEvent.change(userField, {
    target: { value: overrides.user ?? "snmp-user" }
  });
  fireEvent.change(screen.getByLabelText(/Auth Pass Phrase/i), {
    target: { value: overrides.authPassPhrase ?? "auth-pass" }
  });
  fireEvent.change(screen.getByLabelText(/Privacy Pass Phrase/i), {
    target: { value: overrides.privacyPassPhrase ?? "privacy-pass" }
  });

  await selectOptionByIndex(1, overrides.securityLevelOption ?? "Auth Priv");
  await selectOptionByIndex(2, overrides.authProtocolOption ?? "SHA");
  await selectOptionByIndex(3, overrides.privacyProtocolOption ?? "AES");
};

const fillSubmitFieldsWithoutSnmpMissingField = async (missingField) => {
  fireEvent.change(screen.getByLabelText(/IP Address/i), {
    target: { value: "192.168.1.100" }
  });
  fireEvent.change(screen.getByLabelText(/Port/i), {
    target: { value: "1516" }
  });
  fireEvent.change(screen.getByLabelText(/Event Name/i), {
    target: { value: "register_event-1" }
  });

  if (missingField !== "user") {
    const userFields = screen.getAllByLabelText(/User/i);
    const userField = userFields[userFields.length - 1];
    fireEvent.change(userField, {
      target: { value: "snmp-user" }
    });
  }

  if (missingField !== "authPassPhrase") {
    fireEvent.change(screen.getByLabelText(/Auth Pass Phrase/i), {
      target: { value: "auth-pass" }
    });
  }

  if (missingField !== "privacyPassPhrase") {
    fireEvent.change(screen.getByLabelText(/Privacy Pass Phrase/i), {
      target: { value: "privacy-pass" }
    });
  }

  await selectOptionByIndex(1, "Auth Priv");

  if (missingField !== "authProtocol") {
    await selectOptionByIndex(2, "SHA");
  }

  if (missingField !== "privacyProtocol") {
    await selectOptionByIndex(3, "AES");
  }

};

beforeEach(() => {
  jest.clearAllMocks();

  mockBuildTruConfigMessage.mockReturnValue({
    unitConfig: { unitId: "TRU-001" },
    rsuConfigs: []
  });
  mockRegisterRSU.mockResolvedValue({ success: true });
  mockRefresh.mockResolvedValue(undefined);

  useTRUConfig.mockReturnValue({
    registerRSU: mockRegisterRSU,
    buildTruConfigMessage: mockBuildTruConfigMessage
  });

  useTRUStatus.mockReturnValue({
    refresh: mockRefresh,
    truStatuses: mockTRUStatuses
  });
});

test("handleSubmit should show validation error for invalid event format", async () => {
  renderDialog();

  fireEvent.change(screen.getByLabelText(/IP Address/i), {
    target: { value: "192.168.1.100" }
  });
  fireEvent.change(screen.getByLabelText(/Port/i), {
    target: { value: "1516" }
  });
  fireEvent.change(screen.getByLabelText(/Event Name/i), {
    target: { value: "invalid event" }
  });

  fireEvent.click(screen.getByText("Register"));

  await waitFor(() => {
    expect(
      screen.getByText(/Event name must be alphanumeric and can include underscores and hyphens/i)
    ).toBeInTheDocument();
  });

  expect(mockBuildTruConfigMessage).not.toHaveBeenCalled();
  expect(mockRegisterRSU).not.toHaveBeenCalled();
});

test("handleSubmit should submit valid payload and invoke callbacks", async () => {
  const builtMessage = {
    unitConfig: { unitId: "TRU-001" },
    rsuConfigs: [{ action: "add" }]
  };
  mockBuildTruConfigMessage.mockReturnValueOnce(builtMessage);

  const { onClose, onSuccess } = renderDialog();

  await fillRequiredSubmitFields();
  fireEvent.click(screen.getByText("Register"));

  await waitFor(() => {
    expect(mockBuildTruConfigMessage).toHaveBeenCalledWith(
      "TRU-001",
      "add",
      "register_event-1",
      {
        ip: "192.168.1.100",
        port: 1516
      },
      {
        privacyProtocol: "AES",
        securityLevel: "authPriv",
        authProtocol: "SHA",
        authPassPhrase: "auth-pass",
        user: "snmp-user",
        privacyPassPhrase: "privacy-pass",
        rsuMibVersion: "NTCIP1218"
      }
    );
    expect(mockRegisterRSU).toHaveBeenCalledWith(builtMessage);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

test("handleSubmit should surface backend error message when submit fails", async () => {
  mockRegisterRSU.mockRejectedValueOnce({
    response: { data: { message: "Backend rejected request" } }
  });

  renderDialog();
  await fillRequiredSubmitFields();
  fireEvent.click(screen.getByText("Register"));

  await waitFor(() => {
    expect(screen.getByText("Backend rejected request")).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(screen.getByText("Register")).toBeInTheDocument();
  });
});

test("handleSubmit should require SNMP User", async () => {
  renderDialog();
  await fillSubmitFieldsWithoutSnmpMissingField("user");

  fireEvent.click(screen.getByText("Register"));

  await waitFor(() => {
    expect(screen.getByText("SNMP User is required")).toBeInTheDocument();
  });
});

test("handleSubmit should require SNMP Auth Protocol", async () => {
  renderDialog();
  await fillSubmitFieldsWithoutSnmpMissingField("authProtocol");

  fireEvent.click(screen.getByText("Register"));

  await waitFor(() => {
    expect(screen.getByText("SNMP Auth Protocol is required")).toBeInTheDocument();
  });
});

test("handleSubmit should require SNMP Auth Pass Phrase", async () => {
  renderDialog();
  await fillSubmitFieldsWithoutSnmpMissingField("authPassPhrase");

  fireEvent.click(screen.getByText("Register"));

  await waitFor(() => {
    expect(screen.getByText("SNMP Auth Pass Phrase is required")).toBeInTheDocument();
  });
});

test("handleSubmit should require SNMP Privacy Protocol", async () => {
  renderDialog();
  await fillSubmitFieldsWithoutSnmpMissingField("privacyProtocol");

  fireEvent.click(screen.getByText("Register"));

  await waitFor(() => {
    expect(screen.getByText("SNMP Privacy Protocol is required")).toBeInTheDocument();
  });
});

test("handleSubmit should require SNMP Privacy Pass Phrase", async () => {
  renderDialog();
  await fillSubmitFieldsWithoutSnmpMissingField("privacyPassPhrase");

  fireEvent.click(screen.getByText("Register"));

  await waitFor(() => {
    expect(screen.getByText("SNMP Privacy Pass Phrase is required")).toBeInTheDocument();
  });
});

