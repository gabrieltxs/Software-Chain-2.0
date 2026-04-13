// ================= STAGE 2 (Object Definitions) — Refatorado =================

(function() {
  const component = this

  function ensureFallbackStore() {
    if (typeof window.datastore === 'undefined' || typeof window.datastore.get !== 'function') {
      window.datastore = {
        data: {},
        set(payload) {
          if (typeof payload === 'object' && payload !== null) {
            Object.assign(this.data, payload)
          }
        },
        get(key) {
          return this.data[key]
        },
        commit(payload) {
          if (payload && typeof payload === 'object') {
            this.set(payload)
          }
        },
        show() {
          console.log('datastore contents:', this.data)
        }
      }
    }

    if (typeof window.datastore_objs === 'undefined' || typeof window.datastore_objs.set !== 'function') {
      window.datastore_objs = {
        data: {},
        set(key, value) {
          this.data[key] = value
        },
        get(key) {
          return this.data[key]
        },
        keys() {
          return Object.keys(this.data)
        },
        commit() {},
        show() {
          console.log('datastore_objs contents:', this.data)
        }
      }
    }
  }

  ensureFallbackStore()

  const form = document.getElementById('objects-form')
  const slotsContainer = document.getElementById('slots-container')
  const assetGrid = document.getElementById('asset-grid')
  const assetHelper = document.getElementById('asset-helper')
  const objectSummary = document.getElementById('object-summary')

  const objectsName = document.getElementById('objects-name')
  const saveObjectsButton = document.getElementById('save-objects')
  const loadObjectsInput = document.getElementById('load-objects')
  const clearObjectsButton = document.getElementById('clear-objects')

  const summaryTotalSlots = document.getElementById('summary-total-slots')
  const summaryFilledSlots = document.getElementById('summary-filled-slots')
  const summaryActiveSlot = document.getElementById('summary-active-slot')

  const numComponentsRaw = window.datastore.get('Quantidade de Elos na cadeia')
  const numComponents = Number.isFinite(Number(numComponentsRaw)) && Number(numComponentsRaw) > 0
    ? Number(numComponentsRaw)
    : 6

  summaryTotalSlots.textContent = String(numComponents)

  const imageAssets = Object.keys(component.files || {})
    .filter((name) => /\.(png|jpg|jpeg|bmp|gif|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const slots = []
  let activeImageSlot = null

  function getAssetUrl(filename) {
    if (component.files && component.files[filename]) {
      return component.files[filename]
    }
    return filename
  }

  function createButton(label) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    return button
  }

  function setActiveImageSlot(index) {
    activeImageSlot = typeof index === 'number' ? index : null
    slots.forEach((slot, currentIndex) => {
      slot.card.classList.toggle('is-active', activeImageSlot === currentIndex)
    })
    const activeLabel = activeImageSlot === null ? 'Nenhum' : `Elo ${activeImageSlot + 1}`
    summaryActiveSlot.textContent = activeLabel
    assetHelper.textContent = activeImageSlot === null
      ? 'Selecione um elo no modo imagem para habilitar a inserção rápida.'
      : `Clique em uma imagem para preencher o ${activeLabel}.`
    refreshAssetSelection()
  }

  function refreshAssetSelection() {
    const selectedFilename = activeImageSlot === null ? '' : slots[activeImageSlot].imageInput.value.trim()
    Array.from(assetGrid.querySelectorAll('.asset-card')).forEach((card) => {
      card.classList.toggle('is-selected', selectedFilename && card.dataset.filename === selectedFilename)
    })
  }

  function updateSlotMode(slot, mode) {
    slot.mode = mode
    slot.wordButton.classList.toggle('is-selected', mode === 'word')
    slot.imageButton.classList.toggle('is-selected', mode === 'image')

    slot.wordInput.disabled = mode !== 'word'
    slot.imageInput.disabled = mode !== 'image'
    slot.wordInput.parentElement.style.display = mode === 'word' ? 'grid' : 'none'
    slot.imageInput.parentElement.style.display = mode === 'image' ? 'grid' : 'none'

    if (mode === 'image') {
      setActiveImageSlot(slot.index)
    } else if (activeImageSlot === slot.index) {
      setActiveImageSlot(null)
    }

    updateSlotPreview(slot)
    updateSummary()
  }

  function updateSlotPreview(slot) {
    slot.status.textContent = slot.mode === 'image' ? 'Imagem' : 'Palavra'
    const value = slot.mode === 'image' ? slot.imageInput.value.trim() : slot.wordInput.value.trim()

    slot.preview.innerHTML = ''
    if (!value) {
      const placeholder = document.createElement('div')
      placeholder.className = 'slot-preview--empty'
      placeholder.textContent = slot.mode === 'image'
        ? 'Nenhuma imagem selecionada'
        : 'Nenhuma palavra definida'
      slot.preview.appendChild(placeholder)
      return
    }

    if (slot.mode === 'image') {
      const image = document.createElement('img')
      image.src = getAssetUrl(value)
      image.alt = value
      slot.preview.appendChild(image)
    } else {
      const text = document.createElement('div')
      text.style.fontWeight = '800'
      text.style.fontSize = '1.1rem'
      text.textContent = value
      slot.preview.appendChild(text)
    }
  }

  function serializeSlots() {
    return slots.map((slot) => ({
      index: slot.index + 1,
      mode: slot.mode,
      word: slot.wordInput.value,
      image: slot.imageInput.value
    }))
  }

  function updateSummary() {
    const snapshot = serializeSlots()
    const filled = snapshot.filter((slot) => {
      const value = slot.mode === 'image' ? slot.image.trim() : slot.word.trim()
      return value !== ''
    }).length

    summaryFilledSlots.textContent = String(filled)

    objectSummary.innerHTML = ''
    snapshot.forEach((slot) => {
      const row = document.createElement('div')
      row.className = 'summary-row'
      const left = document.createElement('span')
      left.textContent = `Elo ${slot.index}`
      const right = document.createElement('span')
      const value = slot.mode === 'image' ? slot.image.trim() : slot.word.trim()
      right.textContent = value ? `${slot.mode === 'image' ? 'Imagem' : 'Palavra'} · ${value}` : 'Não preenchido'
      row.appendChild(left)
      row.appendChild(right)
      objectSummary.appendChild(row)
    })

    slots.forEach(updateSlotPreview)
    refreshAssetSelection()
  }

  function createSlot(index) {
    const card = document.createElement('section')
    card.className = 'slot-card'

    const header = document.createElement('div')
    header.className = 'slot-card__header'

    const title = document.createElement('div')
    title.className = 'slot-card__title'
    title.textContent = `Elo ${index + 1}`

    const status = document.createElement('div')
    status.className = 'slot-card__status'
    status.textContent = 'Palavra'

    header.appendChild(title)
    header.appendChild(status)

    const modeSwitch = document.createElement('div')
    modeSwitch.className = 'mode-switch'

    const wordButton = createButton('Palavra')
    const imageButton = createButton('Imagem')

    modeSwitch.appendChild(wordButton)
    modeSwitch.appendChild(imageButton)

    const wordField = document.createElement('div')
    wordField.className = 'field'
    const wordLabel = document.createElement('label')
    wordLabel.textContent = 'Texto da palavra'
    wordLabel.htmlFor = `word-input-${index}`
    const wordInput = document.createElement('input')
    wordInput.type = 'text'
    wordInput.id = `word-input-${index}`
    wordInput.placeholder = 'Digite a palavra do elo'
    wordField.appendChild(wordLabel)
    wordField.appendChild(wordInput)

    const imageField = document.createElement('div')
    imageField.className = 'field'
    const imageLabel = document.createElement('label')
    imageLabel.textContent = 'Arquivo da imagem'
    imageLabel.htmlFor = `image-input-${index}`
    const imageInput = document.createElement('input')
    imageInput.type = 'text'
    imageInput.id = `image-input-${index}`
    imageInput.placeholder = 'Ex.: Gato.png'
    imageField.appendChild(imageLabel)
    imageField.appendChild(imageInput)

    const preview = document.createElement('div')
    preview.className = 'slot-preview'

    card.appendChild(header)
    card.appendChild(modeSwitch)
    card.appendChild(wordField)
    card.appendChild(imageField)
    card.appendChild(preview)

    const slot = {
      index,
      card,
      status,
      wordButton,
      imageButton,
      wordInput,
      imageInput,
      preview,
      mode: 'word'
    }

    wordButton.addEventListener('click', () => updateSlotMode(slot, 'word'))
    imageButton.addEventListener('click', () => updateSlotMode(slot, 'image'))
    wordInput.addEventListener('focus', () => updateSlotMode(slot, 'word'))
    imageInput.addEventListener('focus', () => updateSlotMode(slot, 'image'))
    wordInput.addEventListener('input', updateSummary)
    imageInput.addEventListener('input', updateSummary)

    updateSlotMode(slot, 'word')
    return slot
  }

  function renderSlots() {
    slotsContainer.innerHTML = ''
    slots.length = 0

    for (let index = 0; index < numComponents; index += 1) {
      const slot = createSlot(index)
      slots.push(slot)
      slotsContainer.appendChild(slot.card)
    }

    updateSummary()
  }

  function renderAssetLibrary() {
    assetGrid.innerHTML = ''
    imageAssets.forEach((filename) => {
      const card = document.createElement('button')
      card.type = 'button'
      card.className = 'asset-card'
      card.dataset.filename = filename

      const image = document.createElement('img')
      image.src = getAssetUrl(filename)
      image.alt = filename

      const caption = document.createElement('div')
      caption.className = 'asset-card__name'
      caption.textContent = filename

      card.appendChild(image)
      card.appendChild(caption)

      card.addEventListener('click', () => {
        if (activeImageSlot === null) {
          alert('Selecione primeiro um elo no modo imagem.')
          return
        }
        slots[activeImageSlot].imageInput.value = filename
        updateSlotMode(slots[activeImageSlot], 'image')
        updateSummary()
      })

      assetGrid.appendChild(card)
    })
  }

  function collectStage2Data() {
    const payload = { name_obj: objectsName.value || '' }
    slots.forEach((slot, index) => {
      const slotNumber = index + 1
      payload[`Elo ${slotNumber} Palavra`] = slot.mode === 'word'
      payload[`Elo ${slotNumber} Imagem`] = slot.mode === 'image'
      payload[`Elo ${slotNumber} Texto Palavra`] = slot.wordInput.value
      payload[`Elo ${slotNumber} Texto Imagem`] = slot.imageInput.value
    })
    return payload
  }

  function applyStage2Data(data) {
    objectsName.value = data['name_obj'] || ''

    slots.forEach((slot, index) => {
      const slotNumber = index + 1
      const imageSelected = !!data[`Elo ${slotNumber} Imagem`]
      const wordSelected = !!data[`Elo ${slotNumber} Palavra`]

      slot.wordInput.value = data[`Elo ${slotNumber} Texto Palavra`] || ''
      slot.imageInput.value = data[`Elo ${slotNumber} Texto Imagem`] || ''

      if (imageSelected) {
        updateSlotMode(slot, 'image')
      } else if (wordSelected) {
        updateSlotMode(slot, 'word')
      } else if (slot.imageInput.value.trim()) {
        updateSlotMode(slot, 'image')
      } else {
        updateSlotMode(slot, 'word')
      }
    })

    updateSummary()
  }

  function clearStage2Data() {
    objectsName.value = ''
    slots.forEach((slot) => {
      slot.wordInput.value = ''
      slot.imageInput.value = ''
      updateSlotMode(slot, 'word')
    })
    setActiveImageSlot(null)
    loadObjectsInput.value = ''
    updateSummary()
  }

  function downloadTextFile(filename, text, mimeType) {
    const blob = new Blob([text], { type: mimeType || 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  function saveObjectsFile() {
    const payload = collectStage2Data()
    const safeName = (objectsName.value || 'objetos').trim() || 'objetos'
    downloadTextFile(`${safeName}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
  }

  function loadObjectsFile(file) {
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = function(event) {
      try {
        const data = JSON.parse(event.target.result)
        applyStage2Data(data)
      } catch (error) {
        console.error('Falha ao carregar objetos:', error)
        alert('Não foi possível ler o arquivo de objetos. Verifique se ele é um JSON válido.')
      }
    }
    reader.readAsText(file)
  }

  function buildFreshObjectStore() {
    if (window.lab && window.lab.data && typeof window.lab.data.Store === 'function') {
      const freshStore = new window.lab.data.Store()
      freshStore.show = function() {
        console.log('datastore_objs contents:', this.entries || this.data || this)
      }
      window.datastore_objs = freshStore
      return freshStore
    }

    window.datastore_objs = {
      data: {},
      set(key, value) {
        this.data[key] = value
      },
      get(key) {
        return this.data[key]
      },
      keys() {
        return Object.keys(this.data)
      },
      commit() {},
      show() {
        console.log('datastore_objs contents:', this.data)
      }
    }
    return window.datastore_objs
  }

  function storeObjectsInDatastore() {
    const objectStore = buildFreshObjectStore()
    slots.forEach((slot, index) => {
      const slotNumber = index + 1
      const wordValue = slot.wordInput.value.trim()
      const imageValue = slot.imageInput.value.trim()

      if (slot.mode === 'word' && wordValue) {
        objectStore.set(`Elo ${slotNumber} Texto Palavra`, wordValue)
      }

      if (slot.mode === 'image' && imageValue) {
        objectStore.set(`Elo ${slotNumber} Texto Imagem`, imageValue)
      }
    })

    if (typeof objectStore.commit === 'function') {
      objectStore.commit()
    }
    if (typeof objectStore.show === 'function') {
      objectStore.show()
    }
  }

  saveObjectsButton.addEventListener('click', (event) => {
    event.preventDefault()
    saveObjectsFile()
  })

  loadObjectsInput.addEventListener('change', (event) => {
    loadObjectsFile(event.target.files[0])
  })

  clearObjectsButton.addEventListener('click', (event) => {
    event.preventDefault()
    clearStage2Data()
  })

  form.addEventListener('submit', () => {
    storeObjectsInDatastore()
  })

  renderSlots()
  renderAssetLibrary()
  clearStage2Data()
  console.log('Stage 2 refatorado carregado com sucesso.')
}).call(this)
