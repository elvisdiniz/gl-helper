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
            if (isExpired(identificador, item.numero, 120)) setTimeout(() => {
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
const observer = new MutationObserver(function (mutations) {
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
observer.observe(document, config)
