/* Libraries */
import { useState } from "react";

/* Custom functions */
import { useAuth } from "@/utils/authContext";
import { createCollection } from "@/utils/apiCalls";
import { useCollections } from "@/hooks/useCollections";

/* Components */
import SearchBar from "./layout/SearchBar";
import CollectionCarousel from "./collections/CollectionCarousel";
import LoadingPage from "./layout/LoadingPage";

import { VscNewCollection } from "react-icons/vsc";

export default function Collections() {
  const [searchInput, setSearchInput] = useState<string>("");
  const { authState } = useAuth();
  const { collections, setCollections, isLoading } = useCollections();

  function handleCreateCollection() {
    const tempId = crypto.randomUUID();
    const n = collections.length + 1;
    const title = `My Collection #${n}`;
    const description = `This is a place holder description for your Collection #${n}`;

    setCollections((prev) => [
      {
        id: tempId,
        title,
        description,
        collectionType: "standard",
        queryString: tempId,
        films: [],
      },
      ...prev,
    ]);

    createCollection({ id: tempId, title, description })
      .then((confirmed) => {
        setCollections((prev) =>
          prev.map((c) =>
            c.id === tempId
              ? {
                  id: confirmed.id,
                  title: confirmed.title,
                  description: confirmed.description ?? null,
                  collectionType: confirmed.collection_type,
                  queryString: confirmed.id,
                  films: [],
                }
              : c,
          ),
        );
      })
      .catch(() => {
        setCollections((prev) => prev.filter((c) => c.id !== tempId));
      });
  }

  if (isLoading) return <LoadingPage variant="authenticating" />;

  return (
    <div className="font-primary mt-20 min-h-screen w-screen mb-40">
      <div className="flex flex-col items-center w-full">
        <div className="font-heading page-title">COLLECTIONS</div>
        <SearchBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          placeholderString="Search your collections ..."
        />

        {!authState.status ? (
          <div className="mt-10 mb-20 text-sm md:text-base">
            Log in to use collections!
          </div>
        ) : (
          <>
            <div className="my-10">
              <button
                onClick={handleCreateCollection}
                className="flex items-center gap-2 border-1 rounded-sm p-3 border-muted-light/40 bg-control/40 hover:bg-control transition-all ease-out duration-200"
              >
                <VscNewCollection className="text-[24px]" />
                <span>New Collection</span>
              </button>
            </div>
            <section className="@container w-full mt-8 flex flex-col items-center gap-10">
              {collections.map((col) => (
                <CollectionCarousel
                  key={col.id}
                  collection={col}
                  onDelete={(deletedId) =>
                    setCollections((prev) =>
                      prev.filter((c) => c.id !== deletedId),
                    )
                  }
                />
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
