import { defineRouteConfig } from "@medusajs/admin-sdk"
import { PhotoSolid } from "@medusajs/icons"
import { Container, Heading, Table, Button, Drawer } from "@medusajs/ui"
import { useState, useEffect, useMemo } from "react"
import { Link } from "react-router-dom"
import { DigitalProduct } from "../../types"
import CreateDigitalProductForm from "../../components/create-digital-product-form"

const DigitalProductsPage = () => {
  const [digitalProducts, setDigitalProducts] = useState<DigitalProduct[]>([])
  const [open, setOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const pageLimit = 20
  const [count, setCount] = useState(0)
  const pagesCount = useMemo(() => {
    return Math.ceil(count / pageLimit)
  }, [count])
  const canNextPage = useMemo(
    () => currentPage < pagesCount - 1,
    [currentPage, pagesCount]
  )
  const canPreviousPage = useMemo(() => currentPage > 0, [currentPage])

  const nextPage = () => {
    if (canNextPage) {
      setCurrentPage((prev) => prev + 1)
    }
  }

  const previousPage = () => {
    if (canPreviousPage) {
      setCurrentPage((prev) => prev - 1)
    }
  }

  const fetchProducts = () => {
    const query = new URLSearchParams({
      limit: `${pageLimit}`,
      offset: `${pageLimit * currentPage}`,
    })

    fetch(`/admin/digital-products?${query.toString()}`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then(({ digital_products: data, count }) => {
        setDigitalProducts(data || [])
        setCount(count || 0)
      })
  }

  useEffect(() => {
    fetchProducts()
  }, [currentPage])

  return (
    <Container className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Heading level="h1">Digital Products</Heading>
          <p className="text-ui-fg-subtle mt-1">
            Manage downloadable products like e-books, software, and digital media
          </p>
        </div>
        <Drawer
          open={open}
          onOpenChange={(openChanged) => setOpen(openChanged)}
        >
          <Drawer.Trigger onClick={() => setOpen(true)} asChild>
            <Button>Create Digital Product</Button>
          </Drawer.Trigger>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Create Digital Product</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body className="p-4">
              <CreateDigitalProductForm
                onSuccess={() => {
                  setOpen(false)
                  if (currentPage === 0) {
                    fetchProducts()
                  } else {
                    setCurrentPage(0)
                  }
                }}
              />
            </Drawer.Body>
          </Drawer.Content>
        </Drawer>
      </div>

      {digitalProducts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-ui-border-base rounded-lg">
          <PhotoSolid className="w-12 h-12 mx-auto text-ui-fg-subtle mb-4" />
          <p className="text-ui-fg-subtle">No digital products yet</p>
          <p className="text-ui-fg-muted text-sm mt-1">
            Create your first digital product to start selling downloadable content
          </p>
        </div>
      ) : (
        <>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>Media Files</Table.HeaderCell>
                <Table.HeaderCell>Action</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {digitalProducts.map((digitalProduct) => (
                <Table.Row key={digitalProduct.id}>
                  <Table.Cell className="font-medium">
                    {digitalProduct.name}
                  </Table.Cell>
                  <Table.Cell>
                    {digitalProduct.medias?.length || 0} file(s)
                  </Table.Cell>
                  <Table.Cell>
                    {digitalProduct.product_variant && (
                      <Link
                        to={`/products/${(digitalProduct.product_variant as any)?.product_id}`}
                        className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                      >
                        View Product
                      </Link>
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
          <Table.Pagination
            count={count}
            pageSize={pageLimit}
            pageIndex={currentPage}
            pageCount={pagesCount}
            canPreviousPage={canPreviousPage}
            canNextPage={canNextPage}
            previousPage={previousPage}
            nextPage={nextPage}
          />
        </>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Digital Products",
  icon: PhotoSolid,
})

export default DigitalProductsPage
