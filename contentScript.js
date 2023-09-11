const targetHost = 'https://gestaodelicitacoes.com'
const itemUri = /\/comprasnet-web\/seguro\/governo\/selecao-fornecedores\/item\/(\d+)$/
const groupUri = /\/comprasnet-web\/seguro\/governo\/selecao-fornecedores\/item\/(-\d+)$/

const itemUpdate = (item, identificador, token) => {
    let url = `/comprasnet-fase-externa/v1/compras/${identificador}/em-selecao-fornecedores/itens/${item}/propostas`
    fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(data => {
            console.log(data)
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
            data[0].propostasItem.forEach(proposta => {
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
            });
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
        }
        previousUrl = window.location.href
    }
});
const config = { subtree: true, childList: true }

// start listening to changes
observer.observe(document, config)