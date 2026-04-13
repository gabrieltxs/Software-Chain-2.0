// ================= STAGE 1 (Configuration) — Refatorado =================

(function() {
  const component = this

  if (typeof window.datastore === 'undefined' || typeof window.datastore.set !== 'function') {
    console.warn('window.datastore não encontrado. Criando fallback local.')
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
      },
      keys() {
        return Object.keys(this.data)
      }
    }
  }

  const form = document.getElementById('config-form')
  const introScreen = document.getElementById('laec-intro')
  const introStartButton = document.getElementById('intro-start')
  const configContent = document.getElementById('config-content')
  const configHero = document.getElementById('config-hero')
  const participantName = document.getElementById('participant-name')
  const participantAge = document.getElementById('participant-age')
  const participantSex = document.getElementById('participant-sex')
  const experimenterName = document.getElementById('experimenter-name')
  const configName = document.getElementById('config-name')

  const elos = document.getElementById('elos')
  const sequencia = document.getElementById('sequencia')
  const instructionText = document.getElementById('instruction-text')

  const cluesCount = document.getElementById('clues-count')
  const cluesFields = document.getElementById('clues-fields')

  const tempoCheck = document.getElementById('tempo-check')
  const tempoInput = document.getElementById('tempo-input')
  const acertosCheck = document.getElementById('acertos-check')
  const acertosInput = document.getElementById('acertos-input')
  const errosCheck = document.getElementById('erros-check')
  const errosInput = document.getElementById('erros-input')
  const tentativasCheck = document.getElementById('tentativas-check')
  const tentativasInput = document.getElementById('tentativas-input')

  const saveConfigButton = document.getElementById('save-config')
  const loadConfigInput = document.getElementById('load-config')
  const clearConfigButton = document.getElementById('clear-config')

  const summaryElos = document.getElementById('summary-elos')
  const summarySequencia = document.getElementById('summary-sequencia')
  const summaryClues = document.getElementById('summary-clues')
  const summaryCriteria = document.getElementById('summary-criteria')
  const statusBadge = document.getElementById('config-status-badge')

  function toggleField(checkbox, input) {
    input.disabled = !checkbox.checked
  }

  function setCheckboxAndField(checkbox, input, checked, value) {
    checkbox.checked = !!checked
    input.value = value || ''
    toggleField(checkbox, input)
  }

  function createClueField(index, value) {
    const wrapper = document.createElement('div')
    wrapper.className = 'field'

    const label = document.createElement('label')
    label.htmlFor = `clue-field-${index}`
    label.textContent = `Conjunto de dicas ${index}`

    const input = document.createElement('input')
    input.type = 'text'
    input.id = `clue-field-${index}`
    input.name = `clue_field_${index}`
    input.placeholder = 'resposta correta;dica 1;dica 2;dica 3'
    input.value = value || ''
    input.addEventListener('input', updateSummary)

    const helper = document.createElement('div')
    helper.className = 'helper'
    helper.textContent = 'Use ponto e vírgula para separar resposta e dicas.'

    wrapper.appendChild(label)
    wrapper.appendChild(input)
    wrapper.appendChild(helper)
    return wrapper
  }

  function generateClueFields(count, values) {
    const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0
    cluesFields.innerHTML = ''

    for (let i = 1; i <= safeCount; i += 1) {
      const value = Array.isArray(values) ? values[i - 1] : ''
      cluesFields.appendChild(createClueField(i, value))
    }

    updateSummary()
  }

  function getClueValues() {
    return Array.from(cluesFields.querySelectorAll('input')).map((input) => input.value)
  }

  function revealConfiguration() {
    if (introScreen) {
      introScreen.hidden = true
    }

    if (configContent) {
      configContent.hidden = false
    }

    if (introStartButton) {
      introStartButton.setAttribute('aria-expanded', 'true')
    }

    window.requestAnimationFrame(() => {
      if (configHero && typeof configHero.scrollIntoView === 'function') {
        configHero.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }

      if (participantName && typeof participantName.focus === 'function') {
        participantName.focus()
      }
    })
  }

  function collectStage1Data() {
    return {
      'Nome do Participante': participantName.value,
      'Idade': participantAge.value,
      'Sexo': participantSex.value,
      'Nome do Experimentador': experimenterName.value,
      'Quantidade de Elos na cadeia': elos.value,
      'Sequência': sequencia.value,
      'Clues': getClueValues(),
      'Instrução': instructionText.value,
      'Tempo': tempoInput.value,
      'Tempo_chk': tempoCheck.checked,
      'Acertos': acertosInput.value,
      'Acertos_chk': acertosCheck.checked,
      'Erros': errosInput.value,
      'Erros_chk': errosCheck.checked,
      'Tentativas': tentativasInput.value,
      'Tentativas_chk': tentativasCheck.checked,
      'Nome da Configuração': configName.value
    }
  }

  function applyStage1Data(data) {
    participantName.value = data['Nome do Participante'] || ''
    participantAge.value = data['Idade'] || ''
    participantSex.value = data['Sexo'] || 'Masculino'
    experimenterName.value = data['Nome do Experimentador'] || ''
    elos.value = data['Quantidade de Elos na cadeia'] || '6'
    sequencia.value = data['Sequência'] || ''
    instructionText.value = data['Instrução'] || ''
    configName.value = data['Nome da Configuração'] || ''

    setCheckboxAndField(tempoCheck, tempoInput, data['Tempo_chk'], data['Tempo'])
    setCheckboxAndField(acertosCheck, acertosInput, data['Acertos_chk'], data['Acertos'])
    setCheckboxAndField(errosCheck, errosInput, data['Erros_chk'], data['Erros'])
    setCheckboxAndField(tentativasCheck, tentativasInput, data['Tentativas_chk'], data['Tentativas'])

    const clues = Array.isArray(data['Clues']) ? data['Clues'] : []
    cluesCount.value = String(clues.length)
    generateClueFields(clues.length, clues)
    updateSummary()
  }

  function clearStage1Form() {
    participantName.value = ''
    participantAge.value = ''
    participantSex.value = 'Masculino'
    experimenterName.value = ''
    elos.value = '6'
    sequencia.value = ''
    instructionText.value = ''
    configName.value = ''

    setCheckboxAndField(tempoCheck, tempoInput, false, '')
    setCheckboxAndField(acertosCheck, acertosInput, false, '')
    setCheckboxAndField(errosCheck, errosInput, false, '')
    setCheckboxAndField(tentativasCheck, tentativasInput, false, '')

    cluesCount.value = '0'
    generateClueFields(0, [])
    loadConfigInput.value = ''
    updateSummary()
  }

  function updateSummary() {
    const activeCriteria = [
      tempoCheck.checked,
      acertosCheck.checked,
      errosCheck.checked,
      tentativasCheck.checked
    ].filter(Boolean).length

    summaryElos.textContent = elos.value || '—'
    summarySequencia.textContent = sequencia.value || '—'
    summaryClues.textContent = String(getClueValues().filter((value) => value.trim() !== '').length || 0)
    summaryCriteria.textContent = String(activeCriteria)

    if ((configName.value || '').trim()) {
      statusBadge.textContent = `Configuração: ${configName.value.trim()}`
    } else {
      statusBadge.textContent = 'Configuração em edição'
    }
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

  function saveConfigurationFile() {
    const data = collectStage1Data()
    const safeName = (configName.value || 'configuracao').trim() || 'configuracao'
    downloadTextFile(`${safeName}.json`, JSON.stringify(data, null, 2), 'application/json;charset=utf-8')
  }

  function loadConfigurationFile(file) {
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = function(event) {
      try {
        const data = JSON.parse(event.target.result)
        applyStage1Data(data)
      } catch (error) {
        console.error('Falha ao carregar configuração:', error)
        alert('Não foi possível ler o arquivo de configuração. Verifique se ele é um JSON válido.')
      }
    }
    reader.readAsText(file)
  }

  function storeDataInDatastore() {
    const payload = collectStage1Data()
    window.datastore.set(payload)
    if (typeof window.datastore.commit === 'function') {
      window.datastore.commit()
    }
    if (typeof window.datastore.show === 'function') {
      window.datastore.show()
    }
  }

  ;[
    [tempoCheck, tempoInput],
    [acertosCheck, acertosInput],
    [errosCheck, errosInput],
    [tentativasCheck, tentativasInput]
  ].forEach(([checkbox, input]) => {
    checkbox.addEventListener('change', () => {
      toggleField(checkbox, input)
      updateSummary()
    })
    input.addEventListener('input', updateSummary)
  })

  cluesCount.addEventListener('change', () => generateClueFields(cluesCount.value, getClueValues()))
  ;[participantName, participantAge, participantSex, experimenterName, configName, elos, sequencia, instructionText].forEach((element) => {
    element.addEventListener('input', updateSummary)
    element.addEventListener('change', updateSummary)
  })

  if (introStartButton) {
    introStartButton.addEventListener('click', (event) => {
      event.preventDefault()
      revealConfiguration()
    })
  }

  saveConfigButton.addEventListener('click', (event) => {
    event.preventDefault()
    saveConfigurationFile()
  })

  loadConfigInput.addEventListener('change', (event) => {
    loadConfigurationFile(event.target.files[0])
  })

  clearConfigButton.addEventListener('click', (event) => {
    event.preventDefault()
    clearStage1Form()
  })

  form.addEventListener('submit', () => {
    storeDataInDatastore()
  })

  clearStage1Form()
  console.log('Stage 1 refatorado carregado com sucesso.')
}).call(this)
