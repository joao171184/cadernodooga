import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { loadCategorias, saveCategorias, type CategoriaNode } from "@/data/pontos";

interface CategoriasContextType {
  categorias: CategoriaNode[];
  setCategorias: (tree: CategoriaNode[]) => void;
  addCategoria: (nome: string, emoji: string) => void;
  addSubcategoria: (parentNome: string, nome: string, emoji: string) => void;
  renameCategoria: (oldNome: string, newNome: string, newEmoji: string) => void;
  renameSubcategoria: (parentNome: string, oldNome: string, newNome: string, newEmoji: string) => void;
  deleteCategoria: (nome: string) => void;
  deleteSubcategoria: (parentNome: string, nome: string) => void;
}

const CategoriasContext = createContext<CategoriasContextType | null>(null);

export function CategoriasProvider({ children }: { children: ReactNode }) {
  const [categorias, setCategoriasState] = useState<CategoriaNode[]>(loadCategorias);

  useEffect(() => {
    saveCategorias(categorias);
  }, [categorias]);

  const setCategorias = useCallback((tree: CategoriaNode[]) => setCategoriasState(tree), []);

  const addCategoria = useCallback((nome: string, emoji: string) => {
    setCategoriasState((prev) => [...prev, { nome, emoji, filhos: [] }]);
  }, []);

  const addSubcategoria = useCallback((parentNome: string, nome: string, emoji: string) => {
    setCategoriasState((prev) =>
      prev.map((c) =>
        c.nome === parentNome
          ? { ...c, filhos: [...(c.filhos || []), { nome, emoji }] }
          : c
      )
    );
  }, []);

  const renameCategoria = useCallback((oldNome: string, newNome: string, newEmoji: string) => {
    setCategoriasState((prev) =>
      prev.map((c) => (c.nome === oldNome ? { ...c, nome: newNome, emoji: newEmoji } : c))
    );
  }, []);

  const renameSubcategoria = useCallback((parentNome: string, oldNome: string, newNome: string, newEmoji: string) => {
    setCategoriasState((prev) =>
      prev.map((c) =>
        c.nome === parentNome
          ? {
              ...c,
              filhos: (c.filhos || []).map((f) =>
                f.nome === oldNome ? { ...f, nome: newNome, emoji: newEmoji } : f
              ),
            }
          : c
      )
    );
  }, []);

  const deleteCategoria = useCallback((nome: string) => {
    setCategoriasState((prev) => prev.filter((c) => c.nome !== nome));
  }, []);

  const deleteSubcategoria = useCallback((parentNome: string, nome: string) => {
    setCategoriasState((prev) =>
      prev.map((c) =>
        c.nome === parentNome
          ? { ...c, filhos: (c.filhos || []).filter((f) => f.nome !== nome) }
          : c
      )
    );
  }, []);

  return (
    <CategoriasContext.Provider
      value={{
        categorias,
        setCategorias,
        addCategoria,
        addSubcategoria,
        renameCategoria,
        renameSubcategoria,
        deleteCategoria,
        deleteSubcategoria,
      }}
    >
      {children}
    </CategoriasContext.Provider>
  );
}

export function useCategorias() {
  const ctx = useContext(CategoriasContext);
  if (!ctx) throw new Error("useCategorias must be used within CategoriasProvider");
  return ctx;
}
