import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function UsersPlaceholder() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Usuários</h1><p className="text-muted-foreground">Em breve</p></div>
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center py-16">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Gerenciamento de usuários em desenvolvimento</h3>
        </CardContent>
      </Card>
    </div>
  );
}
