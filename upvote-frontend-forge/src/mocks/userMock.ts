
/**
 * Mock data for the current logged-in user
 */
export const currentUser = {
  id: "user_123",
  username: "redditpro",
  email: "user@example.com",
  credits: 125.50,
  joinedDate: "2023-10-15T08:30:00Z",
  profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=redditpro",
  stats: {
    totalOrders: 28,
    activeOrders: 3,
    completedOrders: 25,
  }
};

/**
 * Mock data for account activity
 */
export const accountActivity = [
  { date: "2023-05-10", orders: 5, credits: 45.00 },
  { date: "2023-05-11", orders: 3, credits: 27.50 },
  { date: "2023-05-12", orders: 7, credits: 65.00 },
  { date: "2023-05-13", orders: 2, credits: 18.00 },
  { date: "2023-05-14", orders: 4, credits: 36.00 },
  { date: "2023-05-15", orders: 5, credits: 45.00 },
  { date: "2023-05-16", orders: 6, credits: 54.00 },
];
