import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, MapPin, Pause, ShoppingCart } from "lucide-react";
import { usePublicStorefront } from "../hooks";
import type { PublicStorefrontProduct, PublicStorefrontCategory } from "../types/storefrontPublic";

export function PublicStorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const storefront = usePublicStorefront(slug || "");

  if (storefront.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-4xl">
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-32 bg-gray-200 rounded"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (storefront.isError) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-4xl">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">🏪</div>
              <h2 className="text-2xl font-semibold mb-2">Store Not Found</h2>
              <p className="text-muted-foreground mb-4">
                The store you're looking for doesn't exist or is no longer available.
              </p>
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const { store, catalog } = storefront.data || {};

  if (!store) {
    return null;
  }

  const formatTime = (minutes: number) => `${minutes} min`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-4xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{store.name}</h1>
              {store.description && (
                <p className="text-muted-foreground mb-3">{store.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-sm">
                {store.address && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{store.address}</span>
                  </div>
                )}

                {store.prep_time_minutes && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(store.prep_time_minutes)} prep time</span>
                  </div>
                )}

                {store.is_paused && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Pause className="h-3 w-3" />
                    {store.pause_reason || "Temporarily Unavailable"}
                  </Badge>
                )}

                {!store.is_paused && store.status === "open" && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Open
                  </Badge>
                )}
              </div>
            </div>

            <div className="ml-4">
              <Button size="lg" disabled={store.is_paused}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                {store.is_paused ? "Unavailable" : "Order Now"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl p-4">
        {catalog?.categories?.length ? (
          <div className="space-y-8">
            {catalog.categories.map((category: PublicStorefrontCategory) => (
              <Card key={category.id}>
                <CardHeader>
                  <CardTitle className="text-xl">{category.name}</CardTitle>
                  {category.description && (
                    <p className="text-muted-foreground">{category.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {category.products?.length ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {category.products.map((product: PublicStorefrontProduct) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No products available in this category
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold mb-2">No Products Available</h3>
              <p className="text-muted-foreground">
                This store doesn't have any products listed at the moment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: PublicStorefrontProduct }) {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <Card className={`transition-all ${!product.is_available ? "opacity-60" : "hover:shadow-md"}`}>
      <CardContent className="p-4">
        {product.image_url && (
          <div className="aspect-square mb-3 overflow-hidden rounded-lg bg-gray-100">
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="space-y-2">
          <h3 className="font-semibold">{product.name}</h3>

          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {product.description}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold">{formatPrice(product.price_cents)}</span>

            {!product.is_available && (
              <Badge variant="secondary">Unavailable</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}