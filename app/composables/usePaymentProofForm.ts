import { ref } from 'vue'

export function usePaymentProofForm() {
  const toast = useToast()

  const selectedQrId = ref<string | undefined>(undefined)
  const proofFile = ref<File | null>(null)
  const proofPreview = ref<string | null>(null)
  const fileInput = ref<HTMLInputElement | null>(null)
  const isDragging = ref(false)
  const transactionId = ref('')

  function triggerFileInput() {
    fileInput.value?.click()
  }

  function processFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.add({
        title: 'Invalid File',
        description: 'Please upload an image file (PNG, JPG, WEBP).',
        color: 'error',
      })
      return
    }
    proofFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      proofPreview.value = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files?.[0]) {
      processFile(target.files[0])
    }
  }

  function handleDrop(event: DragEvent) {
    isDragging.value = false
    if (event.dataTransfer?.files?.[0]) {
      processFile(event.dataTransfer.files[0])
    }
  }

  function removeFile() {
    proofFile.value = null
    proofPreview.value = null
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }

  function resetForm() {
    selectedQrId.value = undefined
    transactionId.value = ''
    removeFile()
  }

  return {
    selectedQrId,
    proofFile,
    proofPreview,
    fileInput,
    isDragging,
    transactionId,
    triggerFileInput,
    handleFileChange,
    handleDrop,
    removeFile,
    resetForm,
  }
}
