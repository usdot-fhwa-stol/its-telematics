import { expect, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import ManagementDialog from "../../components/rsu_management/common/ManagementDialog";

test("ManagementDialog should render with title", () => {
  render(
    <ManagementDialog open={true} onClose={() => {}} title="Test Dialog">
      <div>Dialog Content</div>
    </ManagementDialog>
  );

  expect(screen.getByText("Test Dialog")).toBeInTheDocument();
  expect(screen.getByText("Dialog Content")).toBeInTheDocument();
});

test("ManagementDialog should not render when closed", () => {
  const { container } = render(
    <ManagementDialog open={false} onClose={() => {}} title="Test Dialog">
      <div>Dialog Content</div>
    </ManagementDialog>
  );

  expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
});

test("ManagementDialog should call onClose when close button clicked", () => {
  const handleClose = jest.fn();
  render(
    <ManagementDialog open={true} onClose={handleClose} title="Test Dialog">
      <div>Dialog Content</div>
    </ManagementDialog>
  );

  const closeButton = screen.getByLabelText("close");
  fireEvent.click(closeButton);

  expect(handleClose).toHaveBeenCalledTimes(1);
});

test("ManagementDialog should render with actions", () => {
  const actions = (
    <>
      <button>Cancel</button>
      <button>Save</button>
    </>
  );

  render(
    <ManagementDialog open={true} onClose={() => {}} title="Test Dialog" actions={actions}>
      <div>Dialog Content</div>
    </ManagementDialog>
  );

  expect(screen.getByText("Cancel")).toBeInTheDocument();
  expect(screen.getByText("Save")).toBeInTheDocument();
});

test("ManagementDialog should render without actions", () => {
  render(
    <ManagementDialog open={true} onClose={() => {}} title="Test Dialog">
      <div>Dialog Content</div>
    </ManagementDialog>
  );

  expect(screen.getByText("Test Dialog")).toBeInTheDocument();
  expect(screen.getByText("Dialog Content")).toBeInTheDocument();
});

test("ManagementDialog should respect maxWidth prop", () => {
  render(
    <ManagementDialog open={true} onClose={() => {}} title="Test Dialog" maxWidth="lg">
      <div>Dialog Content</div>
    </ManagementDialog>
  );

  // Just verify dialog renders with maxWidth prop accepted
  expect(screen.getByText("Test Dialog")).toBeInTheDocument();
});

test("ManagementDialog should respect fullWidth prop", () => {
  render(
    <ManagementDialog open={true} onClose={() => {}} title="Test Dialog" fullWidth={false}>
      <div>Dialog Content</div>
    </ManagementDialog>
  );

  // Just verify dialog renders with fullWidth prop accepted
  expect(screen.getByText("Test Dialog")).toBeInTheDocument();
});

test("ManagementDialog should render children correctly", () => {
  render(
    <ManagementDialog open={true} onClose={() => {}} title="Test Dialog">
      <div data-testid="custom-content">Custom Content</div>
    </ManagementDialog>
  );

  expect(screen.getByTestId("custom-content")).toBeInTheDocument();
});
