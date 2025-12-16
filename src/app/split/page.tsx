"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Users, Receipt } from "lucide-react";

export default function SplitPage() {
  return (
    <div className="flex flex-col gap-6 pb-20">
      <div>
        <h1 className="text-3xl font-bold">Split Bills</h1>
        <p className="text-muted-foreground">Manage shared expenses easily</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Groups</CardTitle>
            <CardDescription>Manage your splitting groups</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 border-dashed border-2 rounded-lg mx-6 mb-6">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No groups yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a group to start splitting bills with friends.
            </p>
            <Button>Create New Group</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Track who owes what</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 border-dashed border-2 rounded-lg mx-6 mb-6">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No recent activity</h3>
            <p className="text-sm text-muted-foreground">
              Expenses you split will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
