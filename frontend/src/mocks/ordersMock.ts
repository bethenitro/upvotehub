
/**
 * Mock data for order history
 */
export const orders = [
  {
    id: "ord_001",
    type: "one-time",
    redditUrl: "https://reddit.com/r/AskReddit/comments/abc123",
    upvotes: 10,
    status: "completed",
    createdAt: "2023-05-16T09:25:00Z",
    completedAt: "2023-05-16T10:15:00Z",
    cost: 9.99
  },
  {
    id: "ord_002",
    type: "one-time",
    redditUrl: "https://reddit.com/r/pics/comments/def456",
    upvotes: 25,
    status: "in-progress",
    createdAt: "2023-05-16T14:30:00Z",
    completedAt: null,
    cost: 19.99
  },
  {
    id: "ord_003",
    type: "recurring",
    redditUrl: "https://reddit.com/r/gaming/comments/ghi789",
    upvotes: 15,
    status: "scheduled",
    createdAt: "2023-05-15T11:45:00Z",
    nextRunAt: "2023-05-17T12:00:00Z",
    frequency: "daily",
    cost: 12.99
  },
  {
    id: "ord_004",
    type: "one-time",
    redditUrl: "https://reddit.com/r/funny/comments/jkl012",
    upvotes: 50,
    status: "completed",
    createdAt: "2023-05-14T08:15:00Z",
    completedAt: "2023-05-14T10:20:00Z",
    cost: 29.99
  },
  {
    id: "ord_005",
    type: "recurring",
    redditUrl: "https://reddit.com/r/news/comments/mno345",
    upvotes: 20,
    status: "cancelled",
    createdAt: "2023-05-13T13:10:00Z",
    cancelledAt: "2023-05-14T09:30:00Z",
    frequency: "weekly",
    cost: 15.99
  }
];
