import { Card, CardContent } from "@/components/ui/card";
import { ListOrdered } from "lucide-react";

export default function QueuePlaceholder() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Chamador de Senhas</h1><p className="text-muted-foreground">Em breve</p></div>
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center py-16">
          <ListOrdered className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">Módulo em desenvolvimento</h3>
          <p className="text-sm text-muted-foreground mt-2">O chamador de senhas será implementado na próxima fase.</p>
        </CardContent>
      </Card>
    </div>
  );
}
