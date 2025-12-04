import { useState } from "react"
import { Input, Button, Select, toast } from "@medusajs/ui"
import { MediaType } from "../../types"

type CreateMedia = {
  type: MediaType
  file?: File
}

type Props = {
  onSuccess?: () => void
}

const CreateDigitalProductForm = ({ onSuccess }: Props) => {
  const [name, setName] = useState("")
  const [medias, setMedias] = useState<CreateMedia[]>([])
  const [productTitle, setProductTitle] = useState("")
  const [loading, setLoading] = useState(false)

  const onAddMedia = () => {
    setMedias((prev) => [
      ...prev,
      {
        type: MediaType.PREVIEW,
      },
    ])
  }

  const changeFiles = (index: number, data: Partial<CreateMedia>) => {
    setMedias((prev) => [
      ...prev.slice(0, index),
      {
        ...prev[index],
        ...data,
      },
      ...prev.slice(index + 1),
    ])
  }

  const removeMedia = (index: number) => {
    setMedias((prev) => [...prev.slice(0, index), ...prev.slice(index + 1)])
  }

  const uploadMediaFiles = async (type: MediaType) => {
    const formData = new FormData()
    const mediaWithFiles = medias.filter(
      (media) => media.file !== undefined && media.type === type
    )

    if (!mediaWithFiles.length) {
      return
    }

    mediaWithFiles.forEach((media) => {
      if (!media.file) {
        return
      }
      formData.append("files", media.file)
    })

    const { files } = await fetch(`/admin/digital-products/upload/${type}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    }).then((res) => res.json())

    return {
      mediaWithFiles,
      files,
    }
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { mediaWithFiles: previewMedias, files: previewFiles } =
        (await uploadMediaFiles(MediaType.PREVIEW)) || {}
      const { mediaWithFiles: mainMedias, files: mainFiles } =
        (await uploadMediaFiles(MediaType.MAIN)) || {}

      const mediaData: {
        type: MediaType
        file_id: string
        mime_type: string
      }[] = []

      previewMedias?.forEach((media, index) => {
        mediaData.push({
          type: media.type,
          file_id: previewFiles[index].id,
          mime_type: media.file!.type,
        })
      })

      mainMedias?.forEach((media, index) => {
        mediaData.push({
          type: media.type,
          file_id: mainFiles[index].id,
          mime_type: media.file!.type,
        })
      })

      fetch(`/admin/digital-products`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          medias: mediaData,
          product: {
            title: productTitle,
            options: [
              {
                title: "Default",
                values: ["default"],
              },
            ],
            variants: [
              {
                title: productTitle,
                options: {
                  Default: "default",
                },
                manage_inventory: false,
                prices: [],
              },
            ],
          },
        }),
      })
        .then((res) => res.json())
        .then(({ message }) => {
          if (message) {
            throw message
          }
          toast.success("Success", {
            description: "Digital product created successfully",
          })
          onSuccess?.()
        })
        .catch((e) => {
          console.error(e)
          toast.error("Error", {
            description: `An error occurred while creating the digital product: ${e}`,
          })
        })
        .finally(() => setLoading(false))
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div>
        <label className="text-ui-fg-subtle text-sm font-medium mb-1 block">
          Digital Product Name
        </label>
        <Input
          name="name"
          placeholder="e.g., E-Book: Getting Started Guide"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <fieldset className="border border-ui-border-base rounded-lg p-4">
        <legend className="text-ui-fg-base font-medium px-2">Media Files</legend>
        <Button type="button" variant="secondary" onClick={onAddMedia} className="mb-4">
          Add Media File
        </Button>
        {medias.length === 0 && (
          <p className="text-ui-fg-subtle text-sm">
            Add at least one main file (the downloadable content) and optionally a preview file.
          </p>
        )}
        {medias.map((media, index) => (
          <fieldset
            key={index}
            className="my-2 p-4 border border-ui-border-base rounded-lg"
          >
            <div className="flex justify-between items-center mb-2">
              <legend className="text-sm font-medium">
                Media {index + 1}
              </legend>
              <Button
                type="button"
                variant="danger"
                size="small"
                onClick={() => removeMedia(index)}
              >
                Remove
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              <Select
                value={media.type}
                onValueChange={(value) =>
                  changeFiles(index, {
                    type: value as MediaType,
                  })
                }
              >
                <Select.Trigger>
                  <Select.Value placeholder="Media Type" />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={MediaType.PREVIEW}>
                    Preview (Free sample)
                  </Select.Item>
                  <Select.Item value={MediaType.MAIN}>
                    Main (Downloadable after purchase)
                  </Select.Item>
                </Select.Content>
              </Select>
              <Input
                name={`file-${index}`}
                type="file"
                onChange={(e) =>
                  changeFiles(index, {
                    file: e.target.files?.[0],
                  })
                }
              />
            </div>
          </fieldset>
        ))}
      </fieldset>

      <fieldset className="border border-ui-border-base rounded-lg p-4">
        <legend className="text-ui-fg-base font-medium px-2">
          Product Information
        </legend>
        <div>
          <label className="text-ui-fg-subtle text-sm font-medium mb-1 block">
            Product Title
          </label>
          <Input
            name="product_title"
            placeholder="Product title shown in store"
            type="text"
            value={productTitle}
            onChange={(e) => setProductTitle(e.target.value)}
            required
          />
        </div>
      </fieldset>

      <Button type="submit" isLoading={loading} disabled={!name || !productTitle}>
        Create Digital Product
      </Button>
    </form>
  )
}

export default CreateDigitalProductForm
