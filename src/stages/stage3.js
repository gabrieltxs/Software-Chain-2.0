// ================= STAGE 3 (Execution) — Refatorado =================

(function() {
  const component = this

  function createFallbackStore() {
    return {
      data: {},
      set(key, value) {
        if (typeof key === 'object' && key !== null) {
          Object.assign(this.data, key)
        } else {
          this.data[key] = value
        }
      },
      get(key) {
        return this.data[key]
      },
      keys() {
        return Object.keys(this.data)
      },
      commit(payload) {
        if (payload && typeof payload === 'object') {
          this.set(payload)
        }
      },
      show() {
        console.log('store contents:', this.data)
      }
    }
  }

  if (typeof window.datastore === 'undefined' || typeof window.datastore.get !== 'function') {
    console.warn('window.datastore não encontrado em Stage 3. Criando fallback.')
    window.datastore = createFallbackStore()
  }

  if (typeof window.datastore_objs === 'undefined' || typeof window.datastore_objs.get !== 'function') {
    console.warn('window.datastore_objs não encontrado em Stage 3. Criando fallback.')
    window.datastore_objs = createFallbackStore()
  }

  const form = document.getElementById('experiment-form')
  const instructionCopy = document.getElementById('instruction-copy')
  const stimuliGrid = document.getElementById('stimuli-grid')
  const selectedGrid = document.getElementById('selected-grid')

  const progressSequence = document.getElementById('progress-sequence')
  const attemptCountDisplay = document.getElementById('attempt-count')
  const clueProgressDisplay = document.getElementById('clue-progress')
  const elapsedDisplay = document.getElementById('elapsed-display')

  const statusSequenceChip = document.getElementById('status-sequence-chip')
  const statusReasonChip = document.getElementById('status-reason-chip')

  const scoreCorrect = document.getElementById('score-correct')
  const scoreIncorrect = document.getElementById('score-incorrect')

  const criteriaTime = document.getElementById('criteria-time')
  const criteriaCorrect = document.getElementById('criteria-correct')
  const criteriaErrors = document.getElementById('criteria-errors')
  const criteriaAttempts = document.getElementById('criteria-attempts')

  const finalPanel = document.getElementById('final-panel')
  const finishSubmit = document.getElementById('finish-submit')
  const finalReasonCopy = document.getElementById('final-reason-copy')
  const logPreview = document.getElementById('log-preview')

  const clueOverlay = document.getElementById('clue-overlay')
  const clueList = document.getElementById('clue-list')
  const clueResponseInput = document.getElementById('clue-response-input')
  const clueSaveButton = document.getElementById('clue-save-button')
  const clueDialogText = document.getElementById('clue-dialog-text')

  const feedbackAudio = document.getElementById('feedback-audio')

  const finalLogField = document.getElementById('final-log-field')
  const resultsJsonField = document.getElementById('results-json-field')
  const endReasonField = document.getElementById('end-reason-field')
  const totalTimeField = document.getElementById('total-time-field')
  const totalAttemptsField = document.getElementById('total-attempts-field')
  const totalCorrectField = document.getElementById('total-correct-field')
  const totalIncorrectField = document.getElementById('total-incorrect-field')

  function toBoolean(value) {
    return value === true || value === 'true' || value === 1 || value === '1'
  }

  function parseIntegerOr(value, fallback) {
    if (value === '' || value === null || typeof value === 'undefined') {
      return fallback
    }
    const parsed = Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  function naturalEloCompare(a, b) {
    const extractNumber = (text) => {
      const match = String(text).match(/Elo\s+(\d+)/i)
      return match ? Number.parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER
    }
    const aNumber = extractNumber(a)
    const bNumber = extractNumber(b)
    if (aNumber !== bNumber) {
      return aNumber - bNumber
    }
    return String(a).localeCompare(String(b), 'pt-BR')
  }

  function getDateTimeString() {
    const now = new Date()
    const datePart = now.toLocaleDateString('pt-BR')
    const timePart = now.toLocaleTimeString('pt-BR')
    return `${datePart} ${timePart}`
  }

  function downloadTextFile(filename, text, mimeType) {
    const blob = new Blob([text], { type: mimeType || 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  function looksLikeImage(value) {
    return /\.(png|jpg|jpeg|bmp|gif|webp)$/i.test(String(value || '').trim())
  }

  function getAssetUrl(filename) {
    if (component.files && component.files[filename]) {
      return component.files[filename]
    }
    return filename
  }

  function playAudio(filePath) {
    if (!filePath) {
      return
    }
    feedbackAudio.src = filePath
    feedbackAudio.play().catch((error) => {
      console.log('Falha ao reproduzir áudio:', error)
    })
  }

  const numComponents = parseIntegerOr(window.datastore.get('Quantidade de Elos na cadeia'), 6)
  const criteriaTimeEnabled = toBoolean(window.datastore.get('Tempo_chk'))
  const criteriaCorrectEnabled = toBoolean(window.datastore.get('Acertos_chk'))
  const criteriaErrorsEnabled = toBoolean(window.datastore.get('Erros_chk'))
  const criteriaAttemptsEnabled = toBoolean(window.datastore.get('Tentativas_chk'))

  const criteriaTimeValue = parseIntegerOr(window.datastore.get('Tempo'), 0)
  const criteriaCorrectValue = parseIntegerOr(window.datastore.get('Acertos'), 9999)
  const criteriaErrorsValue = parseIntegerOr(window.datastore.get('Erros'), 9999)
  const criteriaAttemptsValue = parseIntegerOr(window.datastore.get('Tentativas'), 9999)

  const sequenceValueRaw = window.datastore.get('Sequência')
  const sequenceTrigger = parseIntegerOr(sequenceValueRaw, 1)
  const instructionText = window.datastore.get('Instrução') || 'Selecione os estímulos na ordem correta.'
  instructionCopy.textContent = instructionText

  statusSequenceChip.textContent = `Sequência: ${sequenceTrigger}`
  criteriaTime.textContent = criteriaTimeEnabled ? `${criteriaTimeValue}s` : 'Desligado'
  criteriaCorrect.textContent = criteriaCorrectEnabled ? String(criteriaCorrectValue) : 'Desligado'
  criteriaErrors.textContent = criteriaErrorsEnabled ? String(criteriaErrorsValue) : 'Desligado'
  criteriaAttempts.textContent = criteriaAttemptsEnabled ? String(criteriaAttemptsValue) : 'Desligado'

  const cluesFromDatastore = window.datastore.get('Clues') || []
  const processedClues = cluesFromDatastore
    .filter((value) => String(value || '').trim() !== '')
    .map((clueString) => {
      const parts = String(clueString).split(';').map((item) => item.trim()).filter((item, index) => index === 0 || item !== '')
      return {
        correctAnswer: parts[0] || '',
        clues: parts.slice(1)
      }
    })

  const sortedKeys = [...window.datastore_objs.keys()].sort(naturalEloCompare)
  const itemsArray = sortedKeys.map((key) => ({
    key,
    value: window.datastore_objs.get(key)
  }))

  const correctOrder = itemsArray.map((item) => item.key)
  let displayArray = [...itemsArray]

  function shuffleArray(array) {
    for (let index = array.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1))
      ;[array[index], array[randomIndex]] = [array[randomIndex], array[index]]
    }
    return array
  }

  shuffleArray(displayArray)

  let correctScore = 0
  let incorrectScore = 0
  let attemptCount = 0
  let currentSequenceIndex = 0
  let lastOverlayScore = 0
  let clueSetIndex = 0
  let clueIndex = 0
  let endReason = 'Completo'
  let startTime = new Date()
  let endTime = null
  let totalExperimentTime = 0
  let experimentEnded = false
  let logPrepared = false
  const resultsData = []

  let elapsedInterval = null

  const dingAudioPath = (component.files && component.files['DING.WAV']) || 'DING.WAV'
  const errorAudioPath = (component.files && component.files['ERRO1.wav']) || 'ERRO1.wav'

  function updateRuntimeDisplays() {
    progressSequence.textContent = `${currentSequenceIndex} / ${correctOrder.length || numComponents}`
    attemptCountDisplay.textContent = String(attemptCount)
    clueProgressDisplay.textContent = processedClues.length
      ? `${Math.min(clueSetIndex + 1, processedClues.length)} / ${processedClues.length}`
      : '0'
    elapsedDisplay.textContent = `${Math.floor((Date.now() - startTime.getTime()) / 1000)}s`
    scoreCorrect.textContent = String(correctScore)
    scoreIncorrect.textContent = String(incorrectScore)
  }

  function buildStimulusNode(item) {
    const card = document.createElement('div')
    card.className = 'stimulus-card'
    card.dataset.key = item.key

    if (looksLikeImage(item.value)) {
      const image = document.createElement('img')
      image.src = getAssetUrl(item.value)
      image.alt = item.value
      card.appendChild(image)
    } else {
      const text = document.createElement('div')
      text.className = 'stimulus-card__text'
      text.textContent = item.value
      card.appendChild(text)
    }

    card.addEventListener('click', () => handleStimulusSelection(item, card))
    return card
  }

  function renderStimuli() {
    stimuliGrid.innerHTML = ''
    displayArray.forEach((item) => {
      stimuliGrid.appendChild(buildStimulusNode(item))
    })
  }

  function appendSelectedItem(item) {
    const card = document.createElement('div')
    card.className = 'selected-card'
    if (looksLikeImage(item.value)) {
      const image = document.createElement('img')
      image.src = getAssetUrl(item.value)
      image.alt = item.value
      card.appendChild(image)
    } else {
      card.textContent = item.value
      card.style.fontWeight = '800'
    }
    selectedGrid.appendChild(card)
  }

  function shuffleStimulusGrid() {
    displayArray = shuffleArray([...displayArray])
    renderStimuli()
  }

  function setStatusReason(text) {
    statusReasonChip.textContent = `Status: ${text}`
  }

  function logResult(entry) {
    resultsData.push(entry)
  }

  function checkTerminationCriteria() {
    if (criteriaCorrectEnabled && correctScore >= criteriaCorrectValue) {
      endReason = 'Critério de acertos atingido'
      endExperiment()
      return true
    }

    if (criteriaErrorsEnabled && incorrectScore >= criteriaErrorsValue) {
      endReason = 'Critério de erros atingido'
      endExperiment()
      return true
    }

    if (criteriaAttemptsEnabled && (correctScore + incorrectScore) >= criteriaAttemptsValue) {
      endReason = 'Critério de tentativas atingido'
      endExperiment()
      return true
    }

    if (currentSequenceIndex >= correctOrder.length && correctOrder.length > 0) {
      endReason = 'Completo (todos os itens da sequência)'
      endExperiment()
      return true
    }

    return false
  }

  function handleStimulusSelection(item) {
    if (experimentEnded) {
      return
    }

    attemptCount += 1
    const now = new Date()
    const elapsedSec = Math.floor((now - startTime) / 1000)
    const timestamp = getDateTimeString()

    const expectedKey = correctOrder[currentSequenceIndex]
    const isCorrect = item.key === expectedKey

    if (isCorrect) {
      correctScore += 1
      currentSequenceIndex += 1
      appendSelectedItem(item)
      playAudio(dingAudioPath)
    } else {
      incorrectScore += 1
      playAudio(errorAudioPath)
    }

    logResult({
      index: attemptCount,
      actionType: 'pick',
      objectChosen: item.value,
      timestamp,
      elapsedSec,
      wasCorrect: isCorrect
    })

    updateRuntimeDisplays()

    if (checkTerminationCriteria()) {
      return
    }

    shuffleStimulusGrid()

    if (
      sequenceTrigger > 0 &&
      correctScore > 0 &&
      correctScore % sequenceTrigger === 0 &&
      correctScore !== lastOverlayScore
    ) {
      lastOverlayScore = correctScore
      showClueOverlay()
    }
  }

  function renderAvailableClues() {
    clueList.innerHTML = ''
    const currentSet = processedClues[clueSetIndex]
    if (!currentSet || !currentSet.clues || !currentSet.clues.length) {
      const placeholder = document.createElement('div')
      placeholder.className = 'clue-item'
      placeholder.textContent = 'Nenhuma dica disponível para este conjunto.'
      clueList.appendChild(placeholder)
      return
    }

    for (let index = 0; index <= clueIndex && index < currentSet.clues.length; index += 1) {
      const clueItem = document.createElement('div')
      clueItem.className = 'clue-item'
      clueItem.textContent = currentSet.clues[index]
      clueList.appendChild(clueItem)
    }
  }

  function showClueOverlay() {
    if (experimentEnded) {
      return
    }

    if (clueSetIndex >= processedClues.length) {
      return
    }

    const currentSet = processedClues[clueSetIndex]
    clueDialogText.textContent = currentSet && currentSet.correctAnswer
      ? `Use as dicas liberadas para tentar identificar o item alvo do conjunto ${clueSetIndex + 1}.`
      : 'Use as dicas liberadas e registre sua hipótese.'

    renderAvailableClues()
    clueResponseInput.value = ''
    clueOverlay.classList.add('is-visible')
    clueOverlay.setAttribute('aria-hidden', 'false')
    clueResponseInput.focus()
  }

  function hideClueOverlay() {
    clueOverlay.classList.remove('is-visible')
    clueOverlay.setAttribute('aria-hidden', 'true')
  }

  function handleClueSubmission() {
    if (experimentEnded) {
      hideClueOverlay()
      return
    }

    if (clueSetIndex >= processedClues.length) {
      hideClueOverlay()
      return
    }

    attemptCount += 1
    const now = new Date()
    const elapsedSec = Math.floor((now - startTime) / 1000)
    const timestamp = getDateTimeString()
    const currentSet = processedClues[clueSetIndex]
    const userGuess = clueResponseInput.value.trim()
    const correctAnswer = (currentSet.correctAnswer || '').trim()
    const userIsCorrect = userGuess.toLowerCase() === correctAnswer.toLowerCase()

    logResult({
      index: attemptCount,
      actionType: 'clue',
      userGuess,
      correctAnswer,
      timestamp,
      elapsedSec,
      wasCorrect: userIsCorrect
    })

    if (userIsCorrect) {
      clueSetIndex += 1
      clueIndex = 0
      hideClueOverlay()
    } else {
      clueIndex += 1

      if (clueIndex >= currentSet.clues.length) {
        if (correctAnswer) {
          alert(`A resposta correta era: ${correctAnswer}`)
        }
        clueSetIndex += 1
        clueIndex = 0
      }
      hideClueOverlay()
    }

    updateRuntimeDisplays()
  }

  function generateFinalLog() {
    const nowString = getDateTimeString()
    const participant = window.datastore.get('Nome do Participante') || ''
    const idade = window.datastore.get('Idade') || ''
    const sexo = window.datastore.get('Sexo') || ''
    const experimentador = window.datastore.get('Nome do Experimentador') || ''
    const nomeConfig = window.datastore.get('Nome da Configuração') || ''
    const quantidadeElos = window.datastore.get('Quantidade de Elos na cadeia') || ''
    const tempo = window.datastore.get('Tempo') || ''
    const acertos = window.datastore.get('Acertos') || ''
    const erros = window.datastore.get('Erros') || ''
    const tentativas = window.datastore.get('Tentativas') || ''
    const userSequence = window.datastore.get('Sequência') || '0'

    const objectLines = [...window.datastore_objs.keys()]
      .sort(naturalEloCompare)
      .map((key, index) => `Objeto ${index + 1}: ${window.datastore_objs.get(key)}`)

    const resultLines = resultsData.map((entry) => {
      if (entry.actionType === 'pick') {
        return `${entry.index} - PICK: ${entry.objectChosen} - ${entry.timestamp} - ${entry.elapsedSec}s - ${entry.wasCorrect ? '(+)' : '(-)'}`
      }
      return `${entry.index} - CLUE: ${entry.userGuess} / Resposta: ${entry.correctAnswer} - ${entry.timestamp} - ${entry.elapsedSec}s - ${entry.wasCorrect ? '(+)' : '(-)'}`
    })

    return [
      'CONFIGURAÇÕES',
      '',
      `Nome do participante.............: ${participant}`,
      `Idade do participante.............: ${idade}`,
      `Sexo do participante..............: ${sexo}`,
      `Nome do experimentador............: ${experimentador}`,
      `Nome da configuração..............: ${nomeConfig}`,
      '',
      'Objetos escolhidos:',
      ...objectLines,
      '',
      `Descrição da coleta..............: ${instructionText}`,
      '',
      'Parâmetros:',
      `Quantidade de elos na cadeia.....: ${quantidadeElos}`,
      `Sequência de acerto para ativar as dicas.....: ${userSequence}`,
      `Tempo limite.....................: ${tempo || '—'}`,
      `Critério de acertos..............: ${acertos || '—'}`,
      `Critério de erros................: ${erros || '—'}`,
      `Critério de tentativas...........: ${tentativas || '—'}`,
      '',
      '----------------------------------------------------------------------------------',
      `RESULTADOS - ${nowString}`,
      ...resultLines,
      '',
      `Motivo de término................: ${endReason}`,
      `Tempo total de experimento.......: ${totalExperimentTime} segundo(s)`,
      `Total de tentativas..............: ${attemptCount}`,
      `Total de acertos.................: ${correctScore}`,
      `Total de erros...................: ${incorrectScore}`
    ].join('\n')
  }

  function prepareFinalPayloadAndDownload() {
    if (logPrepared) {
      return
    }

    if (!endTime) {
      endTime = new Date()
      totalExperimentTime = Math.floor((endTime - startTime) / 1000)
    }

    const finalLog = generateFinalLog()
    finalLogField.value = finalLog
    resultsJsonField.value = JSON.stringify(resultsData, null, 2)
    endReasonField.value = endReason
    totalTimeField.value = String(totalExperimentTime)
    totalAttemptsField.value = String(attemptCount)
    totalCorrectField.value = String(correctScore)
    totalIncorrectField.value = String(incorrectScore)

    logPreview.style.display = 'block'
    logPreview.textContent = finalLog

    downloadTextFile('final_log.txt', finalLog, 'text/plain;charset=utf-8')
    logPrepared = true
  }

  function endExperiment() {
    if (experimentEnded) {
      return
    }

    experimentEnded = true
    if (!endTime) {
      endTime = new Date()
      totalExperimentTime = Math.floor((endTime - startTime) / 1000)
    }

    if (elapsedInterval) {
      clearInterval(elapsedInterval)
    }

    hideClueOverlay()
    setStatusReason('encerrado')
    finalReasonCopy.textContent = `Motivo de término: ${endReason}. Ao clicar no botão abaixo, o componente será submetido corretamente no Lab.js e o arquivo de log também será baixado.`
    finalPanel.classList.add('is-visible')
    updateRuntimeDisplays()
  }

  clueSaveButton.addEventListener('click', handleClueSubmission)
  clueResponseInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleClueSubmission()
    }
  })

  finishSubmit.addEventListener('click', () => {
    prepareFinalPayloadAndDownload()
  })

  form.addEventListener('submit', () => {
    prepareFinalPayloadAndDownload()
  })

  renderStimuli()
  updateRuntimeDisplays()

  elapsedInterval = window.setInterval(() => {
    if (!experimentEnded) {
      updateRuntimeDisplays()
    }
  }, 1000)

  if (criteriaTimeEnabled && criteriaTimeValue > 0) {
    window.setTimeout(() => {
      if (!experimentEnded) {
        endReason = 'Tempo esgotado'
        endExperiment()
      }
    }, criteriaTimeValue * 1000)
  }

  console.log('Stage 3 refatorado carregado com sucesso.')
}).call(this)
