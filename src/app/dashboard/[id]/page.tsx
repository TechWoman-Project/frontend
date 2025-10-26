// src/app/dashboard/[id]/page.tsx
import React from "react";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <h1>Dashboard {id}</h1>
    </div>
  );
}
