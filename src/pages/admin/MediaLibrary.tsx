import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Upload, Trash2, ImageIcon, FileVideo, FolderPlus, Folder, Copy,
  Search, Grid, List,
} from "lucide-react";

interface MediaFile {
  id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  folder: string;
  mime_type: string | null;
  created_at: string;
}

export default function MediaLibrary() {
  const { profile, user } = useAuth();
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState("/");
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const cid = profile?.company_id;

  const fetchFiles = async () => {
    if (!cid) return;
    const { data } = await supabase
      .from("media_files")
      .select("id, name, file_url, file_type, file_size, folder, mime_type, created_at")
      .eq("company_id", cid)
      .order("created_at", { ascending: false });
    setFiles((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchFiles(); }, [cid]);

  const folders = [...new Set(files.map(f => f.folder))].filter(f => f !== "/").sort();

  const filteredFiles = files.filter(f => {
    if (search) return f.name.toLowerCase().includes(search.toLowerCase());
    return f.folder === currentFolder;
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || !cid || !user) return;

    setUploading(true);
    let uploaded = 0;

    for (const file of Array.from(fileList)) {
      const ext = file.name.split(".").pop();
      const path = `${cid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(path, file);

      if (uploadError) {
        toast({ title: `Erro ao enviar ${file.name}`, description: uploadError.message, variant: "destructive" });
        continue;
      }

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);

      const fileType = file.type.startsWith("video") ? "video" : "image";

      await supabase.from("media_files").insert({
        company_id: cid,
        uploaded_by: user.id,
        name: file.name,
        file_path: path,
        file_url: urlData.publicUrl,
        file_type: fileType,
        file_size: file.size,
        folder: currentFolder,
        mime_type: file.type,
      } as any);

      uploaded++;
    }

    toast({ title: `${uploaded} arquivo(s) enviado(s)!` });
    setUploading(false);
    e.target.value = "";
    fetchFiles();
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const name = `/${newFolderName.trim().replace(/^\/+|\/+$/g, "")}`;
    setCurrentFolder(name);
    setFolderDialogOpen(false);
    setNewFolderName("");
    toast({ title: `Pasta "${newFolderName}" criada! Envie arquivos para ela.` });
  };

  const handleDelete = async (file: MediaFile) => {
    // Delete from storage
    const path = file.file_url.split("/media/")[1];
    if (path) await supabase.storage.from("media").remove([decodeURIComponent(path)]);

    // Delete record
    await supabase.from("media_files").delete().eq("id", file.id);
    toast({ title: "Arquivo removido" });
    fetchFiles();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copiada!" });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mídia</h1>
          <p className="text-muted-foreground">{files.length} arquivos</p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><FolderPlus className="h-4 w-4 mr-1" /> Pasta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nova Pasta</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome da pasta</Label>
                  <Input
                    placeholder="Ex: Logos"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateFolder} className="gradient-nex text-white">Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            <Button asChild className="gradient-nex text-white cursor-pointer" disabled={uploading}>
              <span><Upload className="h-4 w-4 mr-2" /> {uploading ? "Enviando..." : "Upload"}</span>
            </Button>
          </label>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar arquivos..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("grid")}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Folder nav */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={currentFolder === "/" ? "default" : "outline"}
          size="sm"
          onClick={() => { setCurrentFolder("/"); setSearch(""); }}
        >
          <Folder className="h-3.5 w-3.5 mr-1" /> Raiz
        </Button>
        {folders.map(f => (
          <Button
            key={f}
            variant={currentFolder === f ? "default" : "outline"}
            size="sm"
            onClick={() => { setCurrentFolder(f); setSearch(""); }}
          >
            <Folder className="h-3.5 w-3.5 mr-1" /> {f.replace("/", "")}
          </Button>
        ))}
      </div>

      {/* Files */}
      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filteredFiles.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center py-16">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Nenhum arquivo</h3>
            <p className="text-sm text-muted-foreground">Faça upload de imagens ou vídeos.</p>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredFiles.map(file => (
            <Card key={file.id} className="bg-card border-border group overflow-hidden hover:border-primary/30 transition-colors">
              <div className="aspect-square relative bg-muted overflow-hidden">
                {file.file_type === "video" ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileVideo className="h-10 w-10 text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={file.file_url}
                    alt={file.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => copyUrl(file.file_url)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(file)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-2">
                <p className="text-xs font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.file_size)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredFiles.map(file => (
            <Card key={file.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardContent className="p-3 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {file.file_type === "video" ? (
                    <FileVideo className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <img src={file.file_url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatSize(file.file_size)} · {file.folder}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyUrl(file.file_url)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(file)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
