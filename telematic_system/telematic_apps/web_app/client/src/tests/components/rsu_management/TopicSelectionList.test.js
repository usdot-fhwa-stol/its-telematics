import { expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react";
import TopicSelectionList from "../../../components/rsu_management/data-selection/components/TopicSelectionList";

const mockTopicsByRSU = [
  {
    rsuKey: "192.168.1.1:8080",
    topics: [
      { name: "location", type: "BSM" },
      { name: "map", type: "MAP" },
      { name: "spat", type: "SPAT" },
    ],
  },
  {
    rsuKey: "192.168.1.2:8081",
    topics: [
      { name: "location", type: "BSM" },
      { name: "tim", type: "TIM" },
    ],
  },
];

test("TopicSelectionList should render title", () => {
  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("Select Data Types")).toBeInTheDocument();
});

test("TopicSelectionList should show selection summary", () => {
  const selectedTopics = {
    "192.168.1.1:8080": ["location", "map"],
  };

  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={selectedTopics}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("2 of 5 selected")).toBeInTheDocument();
});

test("TopicSelectionList should show zero selection initially", () => {
  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("0 of 5 selected")).toBeInTheDocument();
});

test("TopicSelectionList should render RSU groups", () => {
  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("192.168.1.1")).toBeInTheDocument();
  expect(screen.getByText("192.168.1.2")).toBeInTheDocument();
});

test("TopicSelectionList should render topics for each RSU", () => {
  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  const locationTopics = screen.getAllByText("location");
  expect(locationTopics).toHaveLength(2); // One for each RSU

  expect(screen.getByText("map")).toBeInTheDocument();
  expect(screen.getByText("spat")).toBeInTheDocument();
  expect(screen.getByText("tim")).toBeInTheDocument();
});

test("TopicSelectionList should show selection count per RSU", () => {
  const selectedTopics = {
    "192.168.1.1:8080": ["location", "map"],
    "192.168.1.2:8081": ["tim"],
  };

  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={selectedTopics}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("2/3")).toBeInTheDocument();
  expect(screen.getByText("1/2")).toBeInTheDocument();
});

test("TopicSelectionList should render Select All button", () => {
  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  const selectAllButtons = screen.getAllByText("Select All");
  expect(selectAllButtons.length).toBeGreaterThan(0);
});

test("TopicSelectionList should render Clear All button", () => {
  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("Clear All")).toBeInTheDocument();
});

test("TopicSelectionList should disable Clear All when nothing selected", () => {
  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  const clearAllButton = screen.getByText("Clear All");
  expect(clearAllButton).toBeDisabled();
});

test("TopicSelectionList should enable Clear All when something selected", () => {
  const selectedTopics = {
    "192.168.1.1:8080": ["location"],
  };

  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={selectedTopics}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  const clearAllButton = screen.getByText("Clear All");
  expect(clearAllButton).not.toBeDisabled();
});

test("TopicSelectionList should call onSelectAll for global Select All", () => {
  const mockOnSelectAll = jest.fn();

  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={mockOnSelectAll}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  const globalSelectAll = screen.getAllByText("Select All")[0];
  fireEvent.click(globalSelectAll);

  expect(mockOnSelectAll).toHaveBeenCalledWith({
    "192.168.1.1:8080": ["location", "map", "spat"],
    "192.168.1.2:8081": ["location", "tim"],
  });
});

test("TopicSelectionList should call onClearAll", () => {
  const mockOnClearAll = jest.fn();
  const selectedTopics = {
    "192.168.1.1:8080": ["location"],
  };

  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={selectedTopics}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={mockOnClearAll}
      disabled={false}
    />
  );

  const clearAllButton = screen.getByText("Clear All");
  fireEvent.click(clearAllButton);

  expect(mockOnClearAll).toHaveBeenCalledTimes(1);
});

test("TopicSelectionList should call onToggle when checkbox clicked", () => {
  const mockOnToggle = jest.fn();
  const { container } = render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={{}}
      onToggle={mockOnToggle}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  fireEvent.click(checkboxes[0]);

  expect(mockOnToggle).toHaveBeenCalledTimes(1);
  expect(mockOnToggle).toHaveBeenCalledWith("192.168.1.1:8080", "location");
});

test("TopicSelectionList should check selected topics", () => {
  const selectedTopics = {
    "192.168.1.1:8080": ["location", "spat"],
  };

  const { container } = render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={selectedTopics}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  expect(checkboxes[0]).toBeChecked(); // location
  expect(checkboxes[1]).not.toBeChecked(); // map
  expect(checkboxes[2]).toBeChecked(); // spat
});

test("TopicSelectionList should display disabled message when disabled", () => {
  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={true}
    />
  );

  expect(screen.getByText("Please select TRU and RSU(s) to view available data types")).toBeInTheDocument();
});

test("TopicSelectionList should not render topics when disabled", () => {
  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={true}
    />
  );

  expect(screen.queryByText("192.168.1.1")).not.toBeInTheDocument();
});

test("TopicSelectionList should display empty message when no topics", () => {
  render(
    <TopicSelectionList
      topicsByRSU={[]}
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("No topics available for the selected RSU(s)")).toBeInTheDocument();
});

test("TopicSelectionList should handle empty topicsByRSU prop", () => {
  render(
    <TopicSelectionList
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("0 of 0 selected")).toBeInTheDocument();
});

test("TopicSelectionList should show 'Selected' for selected topics", () => {
  const selectedTopics = {
    "192.168.1.1:8080": ["location"],
  };

  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={selectedTopics}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  expect(screen.getByText("Selected")).toBeInTheDocument();
});

test("TopicSelectionList should show 'Not selected' for unselected topics", () => {
  render(
    <TopicSelectionList
      topicsByRSU={mockTopicsByRSU}
      selectedTopics={{}}
      onToggle={() => {}}
      onSelectAll={() => {}}
      onClearAll={() => {}}
      disabled={false}
    />
  );

  const notSelectedElements = screen.getAllByText("Not selected");
  expect(notSelectedElements.length).toBeGreaterThan(0);
});
