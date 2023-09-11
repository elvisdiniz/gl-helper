const targetHost = 'https://gestaodelicitacoes.com'
const itemUri = /\/comprasnet-web\/seguro\/governo\/selecao-fornecedores\/item\/(\d+)$/
const groupUri = /\/comprasnet-web\/seguro\/governo\/selecao-fornecedores\/item\/(-\d+)$/

const setUpdateTime = (identificador, item) => {
    localStorage[`${identificador}-${item}`] = new Date().getTime()
}

const getUpdateTime = (identificador, item) => {
    return localStorage[`${identificador}-${item}`] ?? null
}

const isExpired = (identificador, item, seconds) => {
    let updateTime = getUpdateTime(identificador, item)
    if (!updateTime) return true
    let now = new Date().getTime()
    let diff = now - updateTime
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
                .then(res => {
                    if (res.status === 204) {
                        setUpdateTime(identificador, item)
                    }
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
                .then(res => {
                    if (res.status === 204) {
                        setUpdateTime(identificador, grupo)
                    }
                })
            data[0].propostasItem.forEach((proposta, i) => {
                setTimeout(() => {
                    let identificadorParticipante = proposta.participante.identificacao
                    let url = `/comprasnet-fase-externa/v1/compras/${identificador}/em-selecao-fornecedores/participacoes/${identificadorParticipante}/itens/${grupo}/itens-grupo/propostas`
                    fetch(url, {
                        method: 'GET',
                        headers: { Authorization: `Bearer ${token}` }
                    })
                        .then(res => res.json())
                        .then(data => {
                            fetch(`${targetHost}/api/atualizar-comprasnet/${identificador}/participante/${identificadorParticipante}/grupo/${grupo}`, {
                                method: 'PUT',
                                body: JSON.stringify(data)
                            })
                        })
                }, 2 * 1000 * i)
            })
        })
}

const updateAll = (identificador, token) => {
    let url = 'https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-fase-externa/v1/compras/${identificador}/itens/em-selecao-fornecedores'
    fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            data.forEach((item, i) => {
                if (isExpired(identificador, item.numero, 120)) setTimeout(() => {
                    if (item.tipo == 'I') {
                        itemUpdate(item.identificador, identificador, token)
                    } else if (item.tipo == 'G') {
                        groupUpdate(item.identificador, identificador, token)
                    }
                }, 3 * 1000 * i)
            })
        })
}

let previousUrl = ''
const observer = new MutationObserver(function (mutations) {
    if (window.location.href !== previousUrl) {
        let uriData = null
        if (uriData = itemUri.exec(previousUrl.split('?')[0])) {
            let urlParams = new URLSearchParams(previousUrl.split('?')[1])
            itemUpdate(uriData[1], urlParams.get('identificador'), sessionStorage['accessToken'])
        } else if (uriData = groupUri.exec(previousUrl.split('?')[0])) {
            let urlParams = new URLSearchParams(previousUrl.split('?')[1])
            groupUpdate(uriData[1], urlParams.get('identificador'), sessionStorage['accessToken'])
        } else if (location.href.endsWith('/comprasnet-web/seguro/governo/selecao-fornecedores')) {
            let urlParams = new URLSearchParams(location.href.split('?')[1])
            updateAll(urlParams.get('identificador'), sessionStorage['accessToken'])
        }
        previousUrl = window.location.href
    }
});
const config = { subtree: true, childList: true }

// start listening to changes
observer.observe(document, config)
