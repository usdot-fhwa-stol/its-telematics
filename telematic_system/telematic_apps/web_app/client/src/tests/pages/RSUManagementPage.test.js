import { expect, jest, test } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { TRUStatusProvider } from "../../context/tru-status-context";
import { TRUTopicsProvider } from "../../context/tru-topic-context";
import RSUManagementPage from "../../pages/RSUManagementPage";

// Mock the RSUManagementLayout component
jest.mock("../../components/rsu_management/common/RSUManagementLayout", () => {
  return function MockRSUManagementLayout() {
    return <div data-testid="rsu-management-layout">RSU Management Layout</div>;
  };
});

// Mock the PageAvatar component
jest.mock("../../components/ui/PageAvatar", () => {
  return {
    PageAvatar: function MockPageAvatar({ title }) {
      return <div data-testid="page-avatar">{title}</div>;
    }
  };
});

test("RSUManagementPage should render page title", async () => {
  await act(async () => {
    render(
      <TRUStatusProvider>
        <TRUTopicsProvider>
          <RSUManagementPage />
        </TRUTopicsProvider>
      </TRUStatusProvider>
    );
  });

  await waitFor(() => {
    expect(screen.getByTestId("page-avatar")).toBeInTheDocument();
    expect(screen.getByText("RSU Management")).toBeInTheDocument();
  });
});

test("RSUManagementPage should render RSUManagementLayout", async () => {
  await act(async () => {
    render(
      <TRUStatusProvider>
        <TRUTopicsProvider>
          <RSUManagementPage />
        </TRUTopicsProvider>
      </TRUStatusProvider>
    );
  });

  await waitFor(() => {
    expect(screen.getByTestId("rsu-management-layout")).toBeInTheDocument();
  });
});

test("RSUManagementPage should not throw errors on render", async () => {
  await act(async () => {
    expect(() =>
      render(
        <TRUStatusProvider>
          <TRUTopicsProvider>
            <RSUManagementPage />
          </TRUTopicsProvider>
        </TRUStatusProvider>
      )
    ).not.toThrow();
  });
});
