const updateItem = (item, identificador, token) => {
    let url = `/comprasnet-fase-externa/v1/compras/${identificador}/em-selecao-fornecedores/itens/${item}/propostas`
    fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` }
    })
        .then((res) => res.json())
        .then(data => {

            if (data[0].tipo == 'I') {
                fetch(`https://gestaodelicitacoes.com/api/atualizar-comprasnet/${identificador}/${item}`, {
                    method: 'POST',
                    body: JSON.stringify(data)
                })
                    .then((res) => res.json())
                    .then(data => console.log(data))
            }
        })
}

let previousUrl = ''
const observer = new MutationObserver(function (mutations) {
    if (window.location.href !== previousUrl) {
        previousUrl = window.location.href
        if (location.href.includes('https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/seguro/governo/selecao-fornecedores/item/')) {

            if (location.href.includes('itens-grupo')) {
                return
            }

            let item = location.href.split('item/')[1].split('?')[0]
            let queryParam = location.href.split('?')[1];
            let urlParams = new URLSearchParams(queryParam)
            updateItem(item, urlParams.get('identificador'), sessionStorage['accessToken'])
        }
    }
});
const config = { subtree: true, childList: true }

// start listening to changes
observer.observe(document, config)