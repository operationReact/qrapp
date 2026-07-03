import {
  createFileRoute,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import CategoryDishCard from "@/components/CategoryDishCard";
import { categoryOptions, categoryMenuOptions } from "@/query/options/category";
import {
  BowlFoodIcon,
  CaretLeftIcon,
  FunnelIcon,
} from "@phosphor-icons/react";
import Navbar from "@/components/shared/Navbar";
import MobileMenu from "@/components/shared/MobileMenu";

export const Route = createFileRoute("/categories/$categoryId")({
  component: CategoryPage,
});

function CategoryPage() {
  const { categoryId } = useParams({ strict: false });
  const navigate = useNavigate();

  const {
    data: category,
    isLoading: categoryLoading,
    isError: categoryError,
  } = useQuery(categoryOptions(categoryId));

  const {
    data: items,
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useQuery(categoryMenuOptions(categoryId));

  const isLoading = categoryLoading || itemsLoading;
  const isError = categoryError || itemsError;

  return (
    <div className="page-shell bg-background pb-mobile-nav! md:pb-[initial]!">
      <Navbar />
      <MobileMenu />
      {/* HERO */}
      <div className="relative">
        <div className="h-35 w-full overflow-hidden">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 200 200"
            preserveAspectRatio="xMidYMid slice"
            className="h-full w-full"
            aria-hidden="true"
          >
            <rect fill="#FF4E4D" width="200" height="200" />
            <polygon
              fill="#FB2C36"
              fillOpacity="1"
              points="100 0 0 100 100 100 100 200 200 100 200 0"
            />
          </svg>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />

        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          onClick={() => navigate({ to: "/" })}
          aria-label="Go back"
          className="absolute top-3 left-2"
        >
          <CaretLeftIcon weight="bold" className="size-5 text-foreground" />
        </Button>

        <div className="absolute inset-x-0 bottom-0 container-premium flex flex-col gap-1 pb-4">
          {categoryLoading ? (
            <>
              <Skeleton className="h-7 w-32 bg-white/20" />
              <Skeleton className="h-4 w-56 bg-white/20" />
            </>
          ) : categoryError ? (
            <p className="text-sm text-white">Category not found.</p>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white">
                {category?.name}
              </h1>
              <p className="text-sm text-white/80">
                {category?.description}
              </p>
            </>
          )}
        </div>
      </div>

      {/* DISH LIST */}
      <main className="container-premium pt-3">
        {isLoading && <DishListSkeleton />}

        {isError && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            Could not load dishes.
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                onClick={() => refetchItems()}
                className="rounded-xl"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {!isLoading && !isError && (items?.length ?? 0) === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BowlFoodIcon weight="duotone" />
              </EmptyMedia>
              <EmptyTitle>No dishes found</EmptyTitle>
              <EmptyDescription>
                This category has no items yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {!isLoading && !isError && (items?.length ?? 0) > 0 && (
          <div className="flex flex-col">
            {items.map((item, idx) => (
              <div key={item.id}>
                <CategoryDishCard item={item} />
                {idx < items.length - 1 && <Separator />}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function DishListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 p-3">
          <Skeleton className="size-24 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="mt-1 h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
