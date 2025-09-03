// src/app/dashboard/[id]/page.tsx
import React from "react";

export default function DashboardPage({ params }: { params: { id: string } }) {
  return (
    <div>
      <h1>Dashboard {params.id}</h1>
    </div>
  );
}
