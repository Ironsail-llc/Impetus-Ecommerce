export enum MediaType {
  MAIN = "main",
  PREVIEW = "preview",
}

export enum OrderStatus {
  PENDING = "pending",
  SENT = "sent",
}

export type DigitalProductOrder = {
  id: string
  status: OrderStatus
  products: DigitalProduct[]
  order?: {
    id: string
    email?: string
    fulfillments?: {
      id: string
    }[]
  }
}

export type DigitalProduct = {
  id: string
  name: string
  medias: DigitalProductMedia[]
}

export type DigitalProductMedia = {
  id: string
  type: MediaType
  fileId: string
  mimeType: string
  digitalProduct?: DigitalProduct
}
