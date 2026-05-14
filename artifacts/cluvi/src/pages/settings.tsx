import { AppLayout } from "@/components/layout";

export default function Settings() {
  return (
    <AppLayout>
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences.</p>
        <div className="border border-border rounded-xl p-8 text-center text-muted-foreground">
          Settings page under construction.
        </div>
      </div>
    </AppLayout>
  );
}
