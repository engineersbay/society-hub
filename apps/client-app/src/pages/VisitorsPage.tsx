import type { VisitorDto } from "@society-hub/types";
import { useAuth } from "../auth";
import { SimpleCrudPage } from "../components/SimpleCrudPage";

export function VisitorsPage() {
  const { client } = useAuth();
  return (
    <SimpleCrudPage<VisitorDto>
      title="Visitors"
      description="Let the gate know who to expect."
      testId="visitors"
      emptyLabel="No visitors requested yet."
      createLabel="Expect a visitor"
      onList={() => client.listVisitors()}
      onCreate={(v) =>
        client.createVisitor({
          visitorName: v.visitorName,
          phone: v.phone || null,
          purpose: v.purpose || null,
          expectedAt: v.expectedAt || null,
        })
      }
      fields={[
        { name: "visitorName", label: "Visitor name", required: true },
        { name: "phone", label: "Phone" },
        { name: "purpose", label: "Purpose", placeholder: "Delivery, guest, cab…" },
        { name: "expectedAt", label: "Expected at", type: "datetime-local" },
      ]}
      columns={[
        { key: "name", label: "Visitor", render: (r) => r.visitorName },
        { key: "purpose", label: "Purpose", render: (r) => r.purpose ?? "—" },
        {
          key: "status",
          label: "Status",
          render: (r) => (
            <span className="badge">
              {r.checkedOutAt ? "Checked out" : r.checkedInAt ? "Checked in" : "Expected"}
            </span>
          ),
        },
      ]}
    />
  );
}
