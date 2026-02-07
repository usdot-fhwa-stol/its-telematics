import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import * as rsuService from "../../api/api-rsu";
import RSUManagementLayout from "../../components/rsu_management/common/RSUManagementLayout";
import { TRUStatusProvider } from "../../context/tru-status-context";
import { TRUTopicsProvider } from "../../context/tru-topic-context";

// Mock the tab components
jest.mock("../../components/rsu_management/rsu-status/RSUStatusTab", () => {
  return function MockRSUStatusTab() {
    return <div data-testid="rsu-status-tab">RSU Status Tab</div>;
  };
});

jest.mock("../../components/rsu_management/data-selection/DataSelectionTab", () => {
  return function MockDataSelectionTab() {
    return <div data-testid="data-selection-tab">Data Selection Tab</div>;
  };
});

jest.mock("../../components/rsu_management/tru-status/TRUStatusTab", () => {
  return function MockTRUStatusTab() {
    return <div data-testid="tru-status-tab">TRU Status Tab</div>;
  };
});

// Mock the API service
jest.mock("../../api/api-rsu");

beforeEach(() => {
  jest.clearAllMocks();
  rsuService.default = {
    getTRUStatuses: jest.fn().mockResolvedValue([]),
  };
});

test("RSUManagementLayout should render RSU Status tab by default", async () => {
  await act(async () => {
    render(
      <TRUStatusProvider>
        <TRUTopicsProvider>
          <RSUManagementLayout />
        </TRUTopicsProvider>
      </TRUStatusProvider>
    );
  });

  await waitFor(() => {
    expect(screen.getByTestId("rsu-status-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("data-selection-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tru-status-tab")).not.toBeInTheDocument();
  });
});

test("RSUManagementLayout should render all three tabs", async () => {
  await act(async () => {
    render(
      <TRUStatusProvider>
        <TRUTopicsProvider>
          <RSUManagementLayout />
        </TRUTopicsProvider>
      </TRUStatusProvider>
    );
  });

  await waitFor(() => {
    expect(screen.getByText("RSU Status")).toBeInTheDocument();
    expect(screen.getByText("Data Selection")).toBeInTheDocument();
    expect(screen.getByText("TRU Status")).toBeInTheDocument();
  });
});

test("RSUManagementLayout should switch to Data Selection tab when clicked", async () => {
  await act(async () => {
    render(
      <TRUStatusProvider>
        <TRUTopicsProvider>
          <RSUManagementLayout />
        </TRUTopicsProvider>
      </TRUStatusProvider>
    );
  });

  // Click Data Selection tab
  await act(async () => {
    const dataSelectionTab = screen.getByText("Data Selection");
    fireEvent.click(dataSelectionTab);
  });

  await waitFor(() => {
    expect(screen.queryByTestId("rsu-status-tab")).not.toBeInTheDocument();
    expect(screen.getByTestId("data-selection-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("tru-status-tab")).not.toBeInTheDocument();
  });
});

test("RSUManagementLayout should switch to TRU Status tab when clicked", async () => {
  await act(async () => {
    render(
      <TRUStatusProvider>
        <TRUTopicsProvider>
          <RSUManagementLayout />
        </TRUTopicsProvider>
      </TRUStatusProvider>
    );
  });

  // Click TRU Status tab
  await act(async () => {
    const truStatusTab = screen.getByText("TRU Status");
    fireEvent.click(truStatusTab);
  });

  await waitFor(() => {
    expect(screen.queryByTestId("rsu-status-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("data-selection-tab")).not.toBeInTheDocument();
    expect(screen.getByTestId("tru-status-tab")).toBeInTheDocument();
  });
});

test("RSUManagementLayout should switch between all tabs", async () => {
  await act(async () => {
    render(
      <TRUStatusProvider>
        <TRUTopicsProvider>
          <RSUManagementLayout />
        </TRUTopicsProvider>
      </TRUStatusProvider>
    );
  });

  // Start with RSU Status
  await waitFor(() => {
    expect(screen.getByTestId("rsu-status-tab")).toBeInTheDocument();
  });

  // Switch to Data Selection
  await act(async () => {
    fireEvent.click(screen.getByText("Data Selection"));
  });

  await waitFor(() => {
    expect(screen.getByTestId("data-selection-tab")).toBeInTheDocument();
  });

  // Switch to TRU Status
  await act(async () => {
    fireEvent.click(screen.getByText("TRU Status"));
  });

  await waitFor(() => {
    expect(screen.getByTestId("tru-status-tab")).toBeInTheDocument();
  });

  // Switch back to RSU Status
  await act(async () => {
    fireEvent.click(screen.getByText("RSU Status"));
  });

  await waitFor(() => {
    expect(screen.getByTestId("rsu-status-tab")).toBeInTheDocument();
  });
});

test("RSUManagementLayout should not throw errors on render", async () => {
  await act(async () => {
    expect(() =>
      render(
        <TRUStatusProvider>
          <TRUTopicsProvider>
            <RSUManagementLayout />
          </TRUTopicsProvider>
        </TRUStatusProvider>
      )
    ).not.toThrow();
  });
});
