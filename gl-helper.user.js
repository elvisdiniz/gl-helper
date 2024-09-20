// ==UserScript==
// @name         GL Helper
// @namespace    https://gestaodelicitacoes.com/
// @version      2024-09-19
// @description  try to take over the world!
// @author       You
// @match        https://cnetmobile.estaleiro.serpro.gov.br/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

const targetHost = 'https://gestaodelicitacoes.com'
const itemUri = /\/comprasnet-web\/seguro\/governo\/selecao-fornecedores\/item\/(\d+)$/
const groupUri = /\/comprasnet-web\/seguro\/governo\/selecao-fornecedores\/item\/(-\d+)$/

const isExpired = (listaItens, item, seconds) => {
    if (!listaItens[item]) return true
    let now = new Date().getTime()
    let lastUpdate = new Date(listaItens[item]).getTime()
    let diff = now - lastUpdate
    return diff > seconds * 1000
}

const itemUpdate = (item, identificador, token) => {
    let url = `/comprasnet-fase-externa/v1/compras/${identificador}/em-selecao-fornecedores/itens/${item}/propostas`
    fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            fetch(`${targetHost}/api/atualizar-comprasnet/${identificador}/item/${item}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            })
        })
}

const groupUpdate = (grupo, identificador, token) => {
    let url = `/comprasnet-fase-externa/v1/compras/${identificador}/em-selecao-fornecedores/itens/${grupo}/propostas`
    fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            fetch(`${targetHost}/api/atualizar-comprasnet/${identificador}/grupo/${grupo}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            })
            data[0].propostasItem.forEach(async (proposta) => {
                let pagina = 0
                let data_ = []
                do {
                    let identificadorParticipante = proposta.participante.identificacao
                    let url = `/comprasnet-fase-externa/v1/compras/${identificador}/em-selecao-fornecedores/participacoes/${identificadorParticipante}/itens/${grupo}/itens-grupo/propostas?tamanhoPagina=10&pagina=${pagina}`
                    let res = await fetch(url, {
                        method: 'GET',
                        headers: { Authorization: `Bearer ${token}` }
                    })
                    data_ = await res.json()
                    if (data_.length > 0) fetch(`${targetHost}/api/atualizar-comprasnet/${identificador}/participante/${identificadorParticipante}/grupo/${grupo}`, {
                        method: 'PUT',
                        body: JSON.stringify(data_)
                    })
                    pagina++
                } while (data_.length > 0)
            })
        })
}

const updateAll = async (identificador, token) => {
    let res = null
    res = await fetch(`${targetHost}/api/pregao/${identificador}/itens-pregao`)
    let itensPregao = await res.json()
    res = await fetch(`${targetHost}/api/pregao/${identificador}/grupos-pregao`)
    let gruposPregao = await res.json()

    let dataUltimaAtualizacao = {}
    itensPregao.forEach(item => {
        dataUltimaAtualizacao[`${item.numero}`] = item.dataUltimaAtualizacao
    })
    gruposPregao.forEach(grupo => {
        dataUltimaAtualizacao[`G${grupo.numero}`] = grupo.dataUltimaAtualizacao
    })

    let pagina = 0
    let data = []
    do {
        let url = `https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-fase-externa/v1/compras/${identificador}/itens/em-selecao-fornecedores?tamanhoPagina=10&pagina=${pagina}&filtro=1`
        let res = await fetch(url, {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` }
        })
        data = await res.json()
        data.forEach((item, i) => {
            if (isExpired(dataUltimaAtualizacao, item.identificador, 7200)) setTimeout(() => {
                if (item.tipo == 'I') {
                    itemUpdate(item.numero, identificador, token)
                } else if (item.tipo == 'G') {
                    groupUpdate(item.numero, identificador, token)
                }
            }, 3 * 1000 * i)
        })
        pagina++
    } while (data.length > 0)
}

let previousUrl = ''
const observer = new MutationObserver((mutations) => {
    if (window.location.href !== previousUrl) {
        let uriData = null
        if (uriData = itemUri.exec(previousUrl.split('?')[0])) {
            let urlParams = new URLSearchParams(previousUrl.split('?')[1])
            itemUpdate(uriData[1], urlParams.get('identificador'), sessionStorage['accessToken'])
        } else if (uriData = groupUri.exec(previousUrl.split('?')[0])) {
            let urlParams = new URLSearchParams(previousUrl.split('?')[1])
            groupUpdate(uriData[1], urlParams.get('identificador'), sessionStorage['accessToken'])
        } else if (location.href.split('?')[0].endsWith('/comprasnet-web/seguro/governo/selecao-fornecedores')) {
            let urlParams = new URLSearchParams(location.href.split('?')[1])
            updateAll(urlParams.get('identificador'), sessionStorage['accessToken'])
        }
        previousUrl = window.location.href
    }
});
const config = { subtree: true, childList: true }

// start listening to changes
if (window.location.href.startsWith('https://cnetmobile.estaleiro.serpro.gov.br')) {
    observer.observe(document, config)
}
