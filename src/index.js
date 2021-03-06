//const async  = require('express-async-await')
//import fetch from 'node-fetch';
//const fetch = require('node-fetch');
//import wixdata from 'wix-data';
const cors = require('cors');
const axios = require('axios');
const bodyParser = require('body-parser');
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const config = require('./config');
const credentials = require('./credentials');
const ejs = require('ejs');
const APP_ID = config.APP_ID;
const APP_SECRET = credentials.APP_SECRET;
const PUBLIC_KEY = config.PUBLIC_KEY;
const AUTH_PROVIDER_BASE_URL = 'https://www.wix.com/oauth';
const INSTANCE_API_URL = 'https://www.wixapis.com/apps/v1';
const STORE_CATALOG_API_URL = 'https://www.wixapis.com/stores/v1';
const STORE_ORDERS_API_URL = 'https://www.wixapis.com/stores/v2';
const PAYMENTS_API_URL = 'https://cashier.wix.com/_api/payment-services-web/merchant/v2';
var kotaku=12;
var beratku=1000;
var simpankota =256;
const app = express();
var server= require('https').createServer(app);
const port = process.env.PORT || 3000;
const incomingWebhooks = [];
app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.text());
app.use(bodyParser.json());
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'statics')));

function getTokensFromWix (authCode) {
  return axios.post(`${AUTH_PROVIDER_BASE_URL}/access`, {
    code: authCode,
    client_secret: APP_SECRET,
    client_id: APP_ID,
    grant_type: "authorization_code",
  }).then((resp) => resp.data);
}

function getAccessToken (refreshToken) {
  return axios.post(`${AUTH_PROVIDER_BASE_URL}/access`, {
    refresh_token: refreshToken,
    client_secret: APP_SECRET,
    client_id: APP_ID,
    grant_type: "refresh_token",
  }).then((resp) => resp.data);
}
function getOngkir(body){
  //console.log(body);
  const options = {
  headers: {'Content-Type': 'application/json','Content-Length': JSON.stringify(body).length}
};
  return axios.post('https://api.rajaongkir.com/starter/cost',JSON.stringify(body),options).then((response)=>{
	  if(response.status==200){
		  return response;
	  }
	  else{
	  return Promise.reject("Fetch did not succeed");}
	  }).catch(function(error){console.log('error : '+error)});
}
async function loadkota(){
	const token = '3b37348ce9c524276f0defba2504bd37';
	const respons = '';
	//const handleAsJson = response => response.json();
	//const handleError = console.error // or some such;
	//const response = await fetch('https://api.rajaongkir.com/starter/city?key='+token+'&format=json')
	//const responseJson = await response.json();
	//return responseJson.rajaongkir.results;
	return axios.get('https://api.rajaongkir.com/starter/city?key='+token+'&format=json')
	.then(function(response){
		//console.log(JSON.stringify(response.data.rajaongkir.results));
		
		return response.data.rajaongkir.results;
		//return respons;
	})
	.catch(function(error){
		console.log(error);
	});
	//return respons;
}


app.post('/webhook-callback', (req, res) => {
  console.log('got webhook event from Wix!', req.body);
  console.log("===========================");
  console.log("app id ",APP_ID);
  console.log("app secret ",APP_SECRET);
  console.log("public key ",PUBLIC_KEY);
  const data = jwt.verify(req.body, PUBLIC_KEY,{ algorithms: ["HS256"] });
  const parsedData =  JSON.parse(data.data);
  const prettyData = {...data, data: {...parsedData, data: JSON.parse(parsedData.data)}};
  console.log('webhook event data after verification:', prettyData);
  incomingWebhooks.push({body: prettyData, headers: req.headers});
  res.send(req.body);
});

app.post('/order', async(req, res) => {
  var a = await loadkota();
  //console.log(a);
  console.log('got webhook order event from Wix!', req.body);
  console.log("===========================");
  console.log("app id ",APP_ID);
  console.log("app secret ",APP_SECRET);
  console.log("public key ",PUBLIC_KEY);
  const data = jwt.verify(req.body, PUBLIC_KEY,{ algorithms: ["RS256"] });
  const parsedData =  JSON.parse(data.data);
  const prettyData = {...data, data: {...parsedData, data: JSON.parse(parsedData.data)}};
  console.log('webhook event data after verification:', prettyData);
  console.log("ordernya : "+JSON.stringify(prettyData.data.data));
  beratku = prettyData.data.data.totals.weight;
  //console.log(prettyData.data.data.billingInfo);
  //console.log(prettyData.data.data.billingInfo.address.city);
  var c = a.filter(function(ss){
		return ss.city_name ==prettyData.data.data.billingInfo.address.city;
	})
	//console.log(c[1].city_id);
  kotaku = c[1].city_id;
  
  incomingWebhooks.push({body: prettyData, headers: req.headers});
  res.send(req.body);
});

app.get('/signup', (req, res) => {
  // This route  is called before the user is asked to provide consent
  // Configure the `Redirect URL` in  Wix Developers to point here
  // *** PUT YOUR SIGNUP CODE HERE *** ///
  console.log("got a call from Wix for signup");
  console.log("==============================");

  const permissionRequestUrl = 'https://www.wix.com/app-oauth-installation/consent';
  const appId = APP_ID;
  const redirectUrl = `https://${req.get('host')}/login`;
  const token = req.query.token;
  var url = `${permissionRequestUrl}?token=${token}&appId=${appId}&redirectUrl=${redirectUrl}`

  console.log("redirecting to " + url);
  console.log("=============================");
  res.redirect(url);
});

app.get('/login',async (req, res) => {
  // This route  is called once the user finished installing your application and Wix redirects them to your application's site (here).
  // Configure the `App URL` in the Wix Developers to point here
  // *** PUT YOUR LOGIN CODE HERE *** ///
  console.log("got a call from Wix for login");
  console.log("=============================");

  const authorizationCode = req.query.code;

  console.log("authorizationCode = " + authorizationCode);

  let refreshToken, accessToken;
  try {
    console.log("getting Tokens From Wix ");
    console.log("=======================");
    const data = await getTokensFromWix(authorizationCode);

    refreshToken = data.refresh_token;
    accessToken = data.access_token;

    console.log("refreshToken = " + refreshToken);
    console.log("accessToken = " + accessToken);
    console.log("=============================");

    instance = await getAppInstance(refreshToken);

    console.log("api call to instance returned: ");
    console.log(instance);

    // TODO: Save the instanceId and tokens for future API calls
    console.log("=============================");
    console.log(`User's site instanceId: ${instance.instance.instanceId}`);
    console.log("=============================");

    // need to post https://www.wix.com/app-oauth-installation/token-received to notif wix that we finished getting the token

    res.render('login', {  title: 'Wix Application', 
                              app_id: APP_ID,
                              site_display_name: instance.site.siteDisplayName,
                              instance_id: instance.instance.instanceId, 
                              permissions: instance.instance.permissions, 
                              token: refreshToken,
                              response: JSON.stringify(instance, null, '\t')});
  } catch (wixError) {
    console.log("Error getting token from Wix");
    console.log({wixError});
    res.status(500);
    return;
  }});

app.get('/', (_, res) => {
	//console.log("asu");
	//var a = loadkota();
  res.status(200).send('Hello Wixaklaskjldaskjldaslkj!');
});
  
app.get('/instance',async (req, res) => {
  
  const refreshToken = req.query.token;

  console.log("refreshToken = " + refreshToken);

  try {
    instance = await getAppInstance(refreshToken);
    res.render('instance', {  title: 'Wix Application', 
                              app_id: APP_ID,
                              site_display_name: instance.site.siteDisplayName,
                              instance_id: instance.instance.instanceId, 
                              response: JSON.stringify(instance, null, '\t')});
  } catch (wixError) {
    console.log("Error getting token from Wix");
    console.log({wixError});
    res.status(500);
    return;
  }
});

app.get('/page',async (req, res) => {
	console.log(kotaku);
	console.log(beratku);
	console.log('kotaku : '+simpankota);
	var a = await loadkota();
	
	var b= []
	//console.log(JSON.stringify(a));
	console.log('PAGELOAD');
  res.render('page', {  title: 'Wix Application',data:a,data2:b});
});
app.get('/dashboard',async (req, res) => {
	var a = await loadkota();
	
	//console.log(JSON.stringify(a));
	console.log('dashboard');
  res.render('dashboard', {  title: 'Dashboard',data:a});
});
app.post('/dashboard',async (req, res) => {
	var a = await loadkota();
	simpankota = req.body.kota;
	//console.log(JSON.stringify(a));
	console.log('kotaku : '+simpankota);
  res.render('dashboard', {  title: 'Dashboard',data:a});
});
app.post('/page', async (req, res)=> {
	
	//console.log(req.body);
	var a = await loadkota();
    const tujuan = req.body.kota;
	const kurir = req.body.kurir;
	//console.log(tujuan);
	//console.log(kurir);
	var b =[];
	await getOngkir({'key':'3b37348ce9c524276f0defba2504bd37','origin':simpankota,'destination':kotaku,'weight':beratku,'courier':kurir}).then(httpResponse=>{
		//console.log('respond : '+JSON.stringify(httpResponse.data));
		var nama = httpResponse.data.rajaongkir.results;
		console.log(JSON.stringify(nama));
		var simpan = httpResponse.data.rajaongkir.results[0].costs;
		//var arr = [];
		simpan.forEach(element =>{
			var a = {
				'courier' : nama[0].code.toUpperCase(),
				'service' : element.service + ' - ' +element.description,
				'etd' : element.cost[0].etd.replace(' HARI','') + ' days',
                'cost' : element.cost[0].value/1000 + 'K IDR'}
			b.push(a);
			//console.log(b);
		});
	})
	//console.log(b);
    res.render('page', {title: 'Wix Application',data:a,data2:b});
});
app.get('/products',async (req, res) => {
  
  const refreshToken = req.query.token;

  console.log("refreshToken = " + refreshToken);

  try {
    out = await getProducts(refreshToken);
    storeProducts = out.response;
    
    if (storeProducts) {
      
      res.render('products', {  title: 'Wix Application', 
                              app_id: APP_ID,
                              total: storeProducts.totalResults,
                              response: JSON.stringify(storeProducts.products, null, "\t")});
    } else {
      var message;
      switch (out.code) {
        case 401: 
          message = `Got 401 - Are you sure you have a Wix Store in your site?`;
          break;
        case 403: 
          message = `Got 403 - No Permissions for Stores. You can add permissions to your application in <a href="https://dev.wix.com/dc3/my-apps/${APP_ID}/workspace/permissions">Wix Developers</a>.`;
          break;
        case 404: 
          message = 'Got 404 - Check your api route';
          break;
        default:
        message = `Got ${out.code}`;
      }  
      res.status(200).send(`<html><body><pre>${message}</pre></body></html>`);
    }
  } catch (wixError) {
    console.log("Error getting token from Wix");
    console.log({wixError});
    res.status(500);
    return;
  }
});

app.get('/orders',async (req, res) => {
  
  const refreshToken = req.query.token;

  console.log("refreshToken = " + refreshToken);

  try {
    out = await getOrders(refreshToken);  
    storeOrders = out.response;

    if (storeOrders) {
      res.render('orders', {  title: 'Wix Application', 
                              app_id: APP_ID,
                              total: storeOrders.totalResults,
                              response: JSON.stringify(storeOrders, null, "\t")});
    } else {
      var message;
      switch (out.code) {
        case 401: 
          message = `Got 401 - Are you sure you have a Wix Store in your site?`;
          break;
        case 403: 
          message = `Got 403 - No Permissions for orders. You can add permissions to your application in <a href="https://dev.wix.com/dc3/my-apps/${APP_ID}/workspace/permissions">Wix Developers</a>.`;
          break;
        case 404: 
          message = 'Got 404 - Check your api route';
          break;
        default:
        message = `Got ${out.code}`;
		console.log(message);
      }	  
      res.status(200).send(`<html><body><pre>${message}</pre></body></html>`);
    }
  } catch (wixError) {
    console.log("Error getting token from Wix");
    console.log({wixError});
    res.status(500);
    return;
  }
});



app.get('/payments',async (req, res) => {
  
  const refreshToken = req.query.token;

  console.log("refreshToken = " + refreshToken);

  try {
    out =  await getPayments(refreshToken);
    transactions = out.response;

    if (transactions) {
      res.render('payments', {  title: 'Wix Application', 
                              app_id: APP_ID,
                              total: transactions.pagination.total,
                              response: JSON.stringify(transactions, null, "\t")});
    } else {
      var message;
      switch (out.code) {
        case 403: 
          message = `Got 403 - No Permissions for payments. You can add permissions to your application in <a href="https://dev.wix.com/dc3/my-apps/${APP_ID}/workspace/permissions">Wix Developers</a>.`;
          break;
        case 404: 
          message = 'Got 404 - Check your api route';
          break;
        default:
        message = `Got ${out.code}`;
      }  
      res.status(200).send(`<html><body><pre>${message}</pre></body></html>`);
    }
  } catch (wixError) {
    console.log({wixError});
    res.status(500);
  }
});

app.get('/webhooks',async (req, res) => {
  res.render('webhooks', {  title: 'Wix Application', 
                            app_id: APP_ID, 
                            webhooks: JSON.stringify(incomingWebhooks, null, 2)});
});

// this is sample call to Wix instance API - you can find it here: https://dev.wix.com/api/app-management.app-instance.html#get-app-instance
async function getAppInstance(refreshToken)
{
  try {
    console.log('getAppInstance with refreshToken = '+refreshToken);
    console.log("==============================");
    const {access_token} = await getAccessToken(refreshToken);
    console.log('accessToken = ' + access_token);

    const body = {
      // *** PUT YOUR PARAMS HERE ***
      //query: {limit: 10},
    };
    const options = {
      headers: {
        authorization: access_token,
      },
    };
    const appInstance = axios.create({
      baseURL: INSTANCE_API_URL,
      headers: {authorization: access_token}
    });
    const instance = (await appInstance.get('instance', body)).data;

    return instance;
  } catch (e) {
    console.log('error in getAppInstance');
    console.log({e});
    return;
  }
};

// This is a sample call to the Wix Product API - you can find it here: https://dev.wix.com/api/wix-stores.stores-catalog.html#query-products
async function getProducts(refreshToken)
{
  try {
    const {access_token} = await getAccessToken(refreshToken);
    const body = {
      // *** PUT YOUR PARAMS HERE ***
    };
    const options = {
      headers: {
        authorization: access_token,
      },
    };
    const appInstance = axios.create({
      baseURL: STORE_CATALOG_API_URL,
      headers: {authorization: access_token}
    });

    const response = (await appInstance.post('products/query', body)).data;
    console.log(response);
    return {response: response, code: 200};
  } catch (e) {
    console.log({e});
    return {code: e.response.status};
  }
};

// This is sample call to the Wix Orders API - you can find it here: https://dev.wix.com/api/wix-stores.stores-orders.html#query-orders
async function getOrders(refreshToken)
{
  try {
    const {access_token} = await getAccessToken(refreshToken);
    const body = {
      // *** PUT YOUR PARAMS HERE ***
    };
    const options = {
      headers: {
        authorization: access_token,
      },
    };
    const appInstance = axios.create({
      baseURL: STORE_ORDERS_API_URL,
      headers: {authorization: access_token}
    });

    const response = (await appInstance.post('orders/query', body)).data;
	console.log(response);
    return {response: response, code: 200};
  } catch (e) {
    console.log({e});
    return {code: e.response.status};
  }
};

// This is a sample call to the Wix Payments API - you can find it here: https://dev.wix.com/api/wix-payments.payments.html#transactions-list
async function getPayments(refreshToken)
{
  try {
    const {access_token} = await getAccessToken(refreshToken);
    const body = {
      // *** PUT YOUR PARAMS HERE ***
    };
    const options = {
      headers: {
        authorization: access_token,
      },
    };
    const appInstance = axios.create({
      baseURL: PAYMENTS_API_URL,
      headers: {authorization: access_token}
    });

    const response = (await appInstance.get('/transactions', body)).data;
    return {response: response, code: 200};
  } catch (e) {
    console.log({e});
    return {code: e.response.status};
  }
};

app.listen(port, () => console.log(`My Wix Application ${APP_ID} is listening on port ${port}!`));
