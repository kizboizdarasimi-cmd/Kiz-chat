import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useSearchUsers } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Search, Loader2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useSearchUsers(
    { q: debouncedQuery },
    { query: { enabled: debouncedQuery.length > 0, queryKey: ['search', debouncedQuery] } }
  );

  return (
    <AppShell title="Search" showBack>
      <div className="px-4 py-4">
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            autoFocus
            placeholder="Search users..." 
            className="pl-11 h-12 bg-secondary/50 border-transparent rounded-xl text-lg focus-visible:ring-primary"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {isLoading && debouncedQuery.length > 0 && (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && debouncedQuery.length > 0 && results?.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No users found matching "{debouncedQuery}"
          </div>
        )}

        {!isLoading && results && results.length > 0 && (
          <div className="flex flex-col gap-1">
            {results.map(user => (
              <Link 
                key={user.id} 
                href={`/u/${user.username}`}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.profilePicture} />
                  <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-foreground truncate">{user.displayName}</h3>
                    {user.isVerified && <Check className="h-3.5 w-3.5 text-primary shrink-0" strokeWidth={3} />}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {debouncedQuery.length === 0 && (
          <div className="text-center py-20 text-muted-foreground/60 flex flex-col items-center">
            <Search className="h-16 w-16 mb-4 opacity-20" />
            <p>Find friends, creators, and brands</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
