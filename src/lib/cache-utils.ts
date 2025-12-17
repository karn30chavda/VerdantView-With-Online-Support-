import { supabase } from "@/lib/supabase";

/**
 * Prefetch and cache group details for offline access
 */
export async function prefetchGroupDetails(groupId: string, userId: string) {
  try {
    // Fetch all group data in parallel
    const [groupResult, membersResult, expensesResult, messagesResult] =
      await Promise.all([
        // Group info
        supabase.from("groups").select("*").eq("id", groupId).single(),

        // Members
        supabase.from("group_members").select("*").eq("group_id", groupId),

        // Expenses with reactions
        supabase
          .from("expenses")
          .select("*, expense_reactions(reaction_type, user_id)")
          .eq("group_id", groupId)
          .order("created_at", { ascending: false }),

        // Messages
        supabase
          .from("group_messages")
          .select("*")
          .eq("group_id", groupId)
          .order("created_at", { ascending: true }),
      ]);

    // Cache the data in localStorage
    if (!groupResult.error && groupResult.data) {
      localStorage.setItem(
        `group_details_${groupId}`,
        JSON.stringify({
          group: groupResult.data,
          members: membersResult.data || [],
          expenses: expensesResult.data || [],
          messages: messagesResult.data || [],
          cachedAt: Date.now(),
        })
      );
    }
  } catch (error) {
    console.error("Error prefetching group details:", error);
  }
}

/**
 * Get cached group details
 */
export function getCachedGroupDetails(groupId: string) {
  try {
    const cached = localStorage.getItem(`group_details_${groupId}`);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.error("Error reading cached group details:", error);
  }
  return null;
}

/**
 * Prefetch multiple groups in the background
 */
export async function prefetchMultipleGroups(
  groupIds: string[],
  userId: string
) {
  // Prefetch one at a time to avoid overwhelming the API
  for (const groupId of groupIds) {
    await prefetchGroupDetails(groupId, userId);
    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
