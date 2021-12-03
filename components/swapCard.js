import React, {useEffect, useState} from 'react';
import SwapForm from './swapForm';
import ArrowDownwardIcon from '@material-ui/icons/ArrowDownward';
import IconButton from '@material-ui/core/IconButton';
import Web3 from 'web3';
import {web3, atari, fantom, weth,routerAddress, factoryContract, exchangeContract, atariContract, fantomContract, gasLimitHex, PairAbi, factoryAddress} from './abi/contract1';
import {stakeContract} from './abi/contracts';
import tokenAbi from './abi/token.json'; 
import { ethers } from 'ethers';
import Slider from '@material-ui/core/Slider';

function SwapCard(){
    const [flag1, setFlag1] = useState(true);
    const [token1, setToken1] = useState("ETHER");
    const [flag2, setFlag2] = useState(true);
    const [token2, setToken2] = useState("Atari");
    const [tokenAddress1, setTokenAddress1] = useState("0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2");
    const [tokenAddress2, setTokenAddress2] = useState("0xdacD69347dE42baBfAEcD09dC88958378780FB62");
    const [amount1, setAmount1] = useState(0);
    const [amount2, setAmount2] = useState(0);
    const [loading, setLoading] = useState(false);
    const [screenWidth, setScreenWidth] = useState();
	const [connectFlag,setConnectFlag]=useState("false");
	const [signer,setSigner]=useState();
	const [userAddress,setAddress]=useState();
	const [balance1,setBalance1]=useState(0);
	const [balance2,setBalance2]=useState(0);
	const [focuse,setFocuse] = useState(1);
	const [slippage,setSlippage] = useState(1);

    useEffect( async()=>{
        if (typeof window !== 'undefined') {
            setScreenWidth(window.innerWidth);
          }
		
		//metamask connect
		if(typeof window !== "undefined"){
			if(window.ethereum){
			const provider = new ethers.providers.Web3Provider(window.ethereum);
			const accounts = await provider.listAccounts();
			
			const chainId = await window.ethereum.request({ method: 'eth_chainId' });
			if(accounts.length==0||chainId!=1){
				setConnectFlag(false)
			}
			else
			{
				var signer=provider.getSigner()
				setSigner(signer);
				//set address
				const UserAddress=await signer.getAddress();
				setAddress(UserAddress);
				setConnectFlag(true);
				
				var tokenContract1=new ethers.Contract(tokenAddress1,tokenAbi,signer);
				var tokenContract2=new ethers.Contract(tokenAddress2,tokenAbi,signer);
				setLoading(true);
				if(tokenAddress1==weth)
					setBalance1((ethers.utils.formatUnits(await provider.getBalance(UserAddress))).slice(0,15));
				else 
					setBalance1(ethers.utils.formatUnits(await tokenContract1.balanceOf(UserAddress),await tokenContract1.decimals()).slice(0,15));
				
				if(tokenAddress2==weth)	
					setBalance2(ethers.utils.formatUnits(await provider.getBalance(UserAddress)).slice(0,15));
				else	
					setBalance2(ethers.utils.formatUnits(await tokenContract2.balanceOf(UserAddress),await tokenContract2.decimals()).slice(0,15));
				setLoading(false);
			}
			}
		}
    },[tokenAddress1,tokenAddress2])

    const handleReverse = async () =>{
		setFocuse(3);
        setToken1(token2);
        setToken2(token1);
		setTokenAddress1(tokenAddress2);
		setTokenAddress2(tokenAddress1);
    }

	useEffect( async ()=>{
		if(focuse==3){
			setAmount2(amount1);
			console.log(userAddress);
			var tokenAmount2=amount1;

			//metamask must connect
			if(connectFlag&&tokenAmount2>0&&token1!=token2){
				
				//exchange router
				var exchangeRouter=exchangeContract.connect(signer);
				
				//token contracts
				var tokenContract1=new ethers.Contract(tokenAddress1,tokenAbi,signer);
				var tokenContract2=new ethers.Contract(tokenAddress2,tokenAbi,signer);

				var token2Decimal = await tokenContract2.decimals();
				var token2Amountfomatted = parseFloat(tokenAmount2).toFixed(token2Decimal);
				if(token2Amountfomatted>0)
				{
					//amount to bignumber
					
					const BNamount=ethers.utils.parseUnits(token2Amountfomatted,await tokenContract2.decimals());
					if(token1=="ETHER"||token2=="ETHER")
						var pairData = await exchangeRouter.getAmountsIn(BNamount, [tokenAddress1, tokenAddress2])
						.catch((err)=>{
							console.log(err);
							setAmount1(0);
						});
					else 
						var pairData = await exchangeRouter.getAmountsIn(BNamount, [tokenAddress1, weth, tokenAddress2])
						.catch((err)=>{
							console.log(err);
							setAmount1(0);
						});
					if(pairData!=null){
						setAmount1(ethers.utils.formatUnits(pairData[0],await tokenContract1.decimals()));
					}
				}
				else setAmount1(0);
			}
		}
    },[tokenAddress1])
    const handleEthForToken = async () =>{
        setLoading(true);
		if(token2=="Atari"){
			const provider = new ethers.providers.Web3Provider(window.ethereum);
			const signer = provider.getSigner();
			var StakeContract = stakeContract.connect(signer)
			var tx = await StakeContract.buy({value:ethers.utils.parseUnits(amount1.toString().slice(0,15))})
			.catch((err)=>{
				alert("OOPs, we can't complete your order, please check your balance.")
				console.log(err)
				setLoading(false);
			});

			if(tx!=null){
				await  provider.waitForTransaction(tx.hash)
				.catch((err)=>{
					setLoading(false);
				});
				setLoading(false);  
				window.location.reload();
			}
		}
		else {
			//swap
			var path=[];
			path[0]=weth;
			path[1]=fantom;
			
			var date=new Date();
			var seconds = Math.floor(date.getTime() / 1000)+1000000;
			
			var exchangeRouter=exchangeContract.connect(signer);
			var tx=await exchangeRouter.swapExactETHForTokens(0,path,window.ethereum.selectedAddress,seconds,{value:ethers.utils.parseUnits(amount1.toString())})
				.catch((err)=>{
					setLoading(false);
				});;
			if(tx!=null){
			    const provider = new ethers.providers.Web3Provider(window.ethereum);
				await  provider.waitForTransaction(tx.hash)
				.catch((err)=>{
					setLoading(false);
				});
				setLoading(false);
			}
	}
    }

    const handleTokenForEth = async () =>{
        setLoading(true);
		 //swap
		 var path=[];
		 path[0]=token1=="Atari"?atari:fantom;
		 path[1]=weth;

		 var tokenAddress=token1=="Atari"?atari:fantom;
		 var tokenContract=token1=="Atari"?atariContract:fantomContract;
		 
		 var date=new Date();
		 var seconds = Math.floor(date.getTime() / 1000)+1000000;
		 
		var exchangeRouter=exchangeContract.connect(signer);
		var tokenRouter=tokenContract.connect(signer);
		var tokenDecimal = await tokenRouter.decimals();

		var tokenAmountBN=ethers.utils.parseUnits(Number(amount1).toFixed(tokenDecimal).toString(),tokenDecimal);
		var tokenMinAmountBN=ethers.utils.parseUnits(Number((amount1*(100-slippage)/100)).toFixed(tokenDecimal).toString(),tokenDecimal);
		//approve token
		console.log(tokenAmountBN);
		var tx=await tokenRouter.approve(routerAddress,tokenAmountBN)	
		.catch((err)=>{
			setLoading(false);
		});

		if(tx!=null){
			const provider = new ethers.providers.Web3Provider(window.ethereum);
			await  provider.waitForTransaction(tx.hash);

			//swap
			var tx=await exchangeRouter.swapExactTokensForETH(tokenAmountBN,tokenMinAmountBN,path,window.ethereum.selectedAddress,seconds)	
				.catch((err)=>{	
					alert("OOPs, we can't complete your order, please check your balance.");
					setLoading(false);
				});
			if(tx!=null){
				const provider = new ethers.providers.Web3Provider(window.ethereum);
				await  provider.waitForTransaction(tx.hash);
				setLoading(false);
			}
		};
    }

    const handleTokenForToken = async () =>{
        setLoading(true);
		 //swap
		 var path=[];
		 path[0]=token1=="Atari"?atari:fantom;
		 path[1]=weth;
		 path[2]=token2=="Atari"?atari:fantom;

		 var tokenAddress=token1=="Atari"?atari:fantom;
		 var tokenContract=token1=="Atari"?atariContract:fantomContract;
		 
		 var date=new Date();
		 var seconds = Math.floor(date.getTime() / 1000)+1000000;

		var exchangeRouter=exchangeContract.connect(signer);
		
		const provider = new ethers.providers.Web3Provider(window.ethereum);
		var tokenRouter=tokenContract.connect(signer);

		var tokenDecimal=await tokenRouter.decimals();
		console.log(tokenDecimal);
		var tokenAmountBN=ethers.utils.parseUnits(amount1.toString(),tokenDecimal);
		var tokenMinAmountBN=ethers.utils.parseUnits(Number((amount1*(100-slippage)/100)).toFixed(tokenDecimal).toString(),tokenDecimal);
		
		//approve token
		var tx=await tokenRouter.approve(routerAddress,tokenAmountBN)	
		.catch((err)=>{
			
			console.log(err);
			setLoading(false);
		});
		if(tx!=null){
			console.log(tx.hash);
			await  provider.waitForTransaction(tx.hash);

			//swap
			var tx=await exchangeRouter.swapExactTokensForTokens(tokenAmountBN,tokenMinAmountBN,path,window.ethereum.selectedAddress,seconds)	
				.catch((err)=>{
					alert("OOPs, we can't complete your order, please check your balance.");
					setLoading(false);
				});
			if(tx!=null){
				const provider = new ethers.providers.Web3Provider(window.ethereum);
				await  provider.waitForTransaction(tx.hash);
				setLoading(false);
			}
		};

    }

    const handleSwap = async () =>{
		if(amount1==0){alert("please input amount")}
		else if(window.ethereum){
			var web3 = new Web3(window.ethereum);
            const accounts = await web3.eth.getAccounts();
            if(accounts.length!=0){
				if(token1==token2) {
					alert("Can’t swap for same token");
					return;
				}
				console.log(token1,token2);
				if(token1=="ETHER")
					{
						console.log("ether transaction");
						handleEthForToken();
					}
					else{
						if(token2=="ETHER"){
							handleTokenForEth();
						}
						else {
							handleTokenForToken();
						}	
				}
			}
		}
    }

    const handleAmount1 = async (e)=>{
		setFocuse(1)
        setAmount1(e.target.value);
		var tokenAmount1=e.target.value;

		console.log(userAddress,token1,token2,"amount",tokenAmount1);
		//metamask must connect
		if(connectFlag&&tokenAmount1>0&&token1!=token2){
			//exchange router
			var exchangeRouter=exchangeContract.connect(signer);
			
			//token contracts
			var tokenContract1=new ethers.Contract(tokenAddress1,tokenAbi,signer);
			var tokenContract2=new ethers.Contract(tokenAddress2,tokenAbi,signer);

			var token1Decimal = await tokenContract1.decimals();
			var token1Amountfomatted = parseFloat(tokenAmount1).toFixed(token1Decimal);
			console.log(token1Decimal,token1)
			if(token1Amountfomatted>0)
			// amount to bignumber
			{
				const BNamount1=ethers.utils.parseUnits(token1Amountfomatted.toString(),token1Decimal);
				if(token1.toUpperCase()=="ETHER"||token2.toUpperCase()=="ETHER")
					{
						console.log("ether swap")
						var pairData1 = await exchangeRouter.getAmountsOut(BNamount1, [tokenAddress1, tokenAddress2])
						.catch((err)=>{
							console.log(err);
							setAmount2(0);
						});

						if(pairData1!=null){
							setAmount2(ethers.utils.formatUnits(pairData1[1],await tokenContract2.decimals()));
						}
					}
				else {
					var pairData1 = await exchangeRouter.getAmountsOut(BNamount1, [tokenAddress1, weth, tokenAddress2])
							.catch((err)=>{
								console.log(err);
								setAmount2(0);
							});
					console.log(pairData1[2]);	

					if(pairData1!=null){
						setAmount2(ethers.utils.formatUnits(pairData1[2],await tokenContract2.decimals()));
					}
					}
				
			}
			else setAmount2(0);
		}
    }

	useEffect(async ()=>{
		console.log("focuse2",focuse)
		if(focuse==2){
			console.log("changeAmount2");
			setLoading(true);
			var tokenAmount1=amount1; 

			console.log(userAddress,token1,token2,"amount",tokenAmount1);
			//metamask must connect
			
			if(token1==token2)
				setAmount2(amount1);
			else if(connectFlag&&tokenAmount1>0&&token1!=token2){
				//exchange router
				var exchangeRouter=exchangeContract.connect(signer);
				
				//token contracts
				var tokenContract1=new ethers.Contract(tokenAddress1,tokenAbi,signer);
				var tokenContract2=new ethers.Contract(tokenAddress2,tokenAbi,signer);

				var token1Decimal = await tokenContract1.decimals();
				var token1Amountfomatted = parseFloat(tokenAmount1).toFixed(token1Decimal);
				console.log(token1Decimal,token1)
				if(token1Amountfomatted>0)
				// amount to bignumber
				{
					const BNamount1=ethers.utils.parseUnits(token1Amountfomatted.toString(),token1Decimal);
					if(token1.toUpperCase()=="ETHER"||token2.toUpperCase()=="ETHER")
						{
							console.log("ether swap")
							var pairData1 = await exchangeRouter.getAmountsOut(BNamount1, [tokenAddress1, tokenAddress2])
							.catch((err)=>{
								console.log(err);
								setAmount2(0);
							});

							if(pairData1!=null){
								setAmount2(ethers.utils.formatUnits(pairData1[1],await tokenContract2.decimals()));
							}
						}
					else {
						var pairData1 = await exchangeRouter.getAmountsOut(BNamount1, [tokenAddress1, weth, tokenAddress2])
								.catch((err)=>{
									console.log(err);
									setAmount2(0);
								});
						console.log(pairData1[2]);	

						if(pairData1!=null){
							setAmount2(ethers.utils.formatUnits(pairData1[2],await tokenContract2.decimals()));
						}
						}
					
				}
				else setAmount2(0);
			}
		}
		setLoading(false);
	},[tokenAddress2])

    const handleAmount2 = async (e)=>{
		setFocuse(2)
        console.log(e.target.value,tokenAddress1,tokenAddress2);
        setAmount2(e.target.value);

		
		console.log(userAddress);
		var tokenAmount2=e.target.value;

		//metamask must connect
		if(connectFlag&&tokenAmount2>0&&token1!=token2){
			
			//exchange router
			var exchangeRouter=exchangeContract.connect(signer);
			
			//token contracts
			var tokenContract1=new ethers.Contract(tokenAddress1,tokenAbi,signer);
			var tokenContract2=new ethers.Contract(tokenAddress2,tokenAbi,signer);

			var token2Decimal = await tokenContract2.decimals();
			var token2Amountfomatted = parseFloat(tokenAmount2).toFixed(token2Decimal);
			if(token2Amountfomatted>0)
			{
				//amount to bignumber
				
				const BNamount=ethers.utils.parseUnits(token2Amountfomatted,await tokenContract2.decimals());
				if(token1=="ETHER"||token2=="ETHER")
					var pairData = await exchangeRouter.getAmountsIn(BNamount, [tokenAddress1, tokenAddress2])
					.catch((err)=>{
						console.log(err);
						setAmount1(0);
					});
				else 
					var pairData = await exchangeRouter.getAmountsIn(BNamount, [tokenAddress1, weth, tokenAddress2])
					.catch((err)=>{
						console.log(err);
						setAmount1(0);
					});
				if(pairData!=null){
					setAmount1(ethers.utils.formatUnits(pairData[0],await tokenContract1.decimals()));
				}
			}
			else setAmount1(0);
		}
    }

	useEffect( async ()=>{
		console.log("focuse1",focuse)
		if(focuse==1){
			setLoading(true);
			var tokenAmount2=amount2;
			if(token1==token2)
				setAmount1(amount2);
			//metamask must connect
			else if(connectFlag&&tokenAmount2>0&&token1!=token2){
				
				//exchange router
				var exchangeRouter=exchangeContract.connect(signer);
				
				//token contracts
				var tokenContract1=new ethers.Contract(tokenAddress1,tokenAbi,signer);
				var tokenContract2=new ethers.Contract(tokenAddress2,tokenAbi,signer);

				var token2Decimal = await tokenContract2.decimals();
				var token2Amountfomatted = parseFloat(tokenAmount2).toFixed(token2Decimal);
				if(token2Amountfomatted>0)
				{
					//amount to bignumber
					
					const BNamount=ethers.utils.parseUnits(token2Amountfomatted,await tokenContract2.decimals());
					if(token1=="ETHER"||token2=="ETHER")
						var pairData = await exchangeRouter.getAmountsIn(BNamount, [tokenAddress1, tokenAddress2])
						.catch((err)=>{
							console.log(err);
							setAmount1(0);
						});
					else 
						var pairData = await exchangeRouter.getAmountsIn(BNamount, [tokenAddress1, weth, tokenAddress2])
						.catch((err)=>{
							console.log(err);
							setAmount1(0);
						});
					if(pairData!=null){
						setAmount1(ethers.utils.formatUnits(pairData[0],await tokenContract1.decimals()));
					}
				}
				else setAmount1(0);
			}
		}
		setLoading(false);
	},[tokenAddress1]);

    const handleToken1 =async (e,v) =>{
		setFocuse(1)
        setToken1(v);
		var tokenAddress;
        if(v=="Atari")
            {
				tokenAddress=atari;
				setTokenAddress1(atari);
			}
        if(v=="Fantom")
            {
				tokenAddress=fantom;
				setTokenAddress1(fantom);
			}
        if(v=="ETHER")
		{
			tokenAddress=weth;
            setTokenAddress1(weth);
		}
        setFlag1(true);

    }
    const handleToken2 =async (e,v) =>{
		setFocuse(2);
        setToken2(v);
		var tokenAddress;
        if(v=="Atari")
		{
			tokenAddress=atari;
            setTokenAddress2(atari);
		}
        if(v=="Fantom")
		{
			tokenAddress=fantom;
            setTokenAddress2(fantom);
		}
        if(v=="ETHER")
		{
			tokenAddress=weth;
            setTokenAddress2(weth);
		}
		
        setFlag2(true);
    }

	const handleSlippage = (event, newValue) => {
		// console.log(slippage)
		setSlippage(Number(newValue))
	}
    return(
        <div className = "x-swapCard-container" style = {screenWidth>800?{paddingLeft:"30px", paddingRight: "30px"}:{paddingRight: "10px", paddingLeft: "10px"}}>
            <div style={{display:'flex',marginBottom:20}}>
				<span className="x-font2">Swap</span>
                <span className="x-font3" style={{marginLeft:'auto',alignSelf:'center'}}>{connectFlag?`Metamask Connected`:`Please connect metamask`}</span>
            </div>
            <SwapForm role = "From" handleToken = {handleToken1} flag = {flag1} setFlag = {setFlag1} token = {token1} handleAmount = {handleAmount1} balance = {balance1} amount = {amount1}/>
            <div className = "text-center">
                <IconButton color="primary" aria-label="upload picture" component="span" onClick = {handleReverse}>
                    <ArrowDownwardIcon style = {{color: "white"}}/>
                </IconButton>
            </div>
            <SwapForm role = "To" handleToken = {handleToken2} flag = {flag2} setFlag = {setFlag2} token = {token2} handleAmount = {handleAmount2} balance = {balance2} amount = {amount2}/>
			<div style = {{height: "40px"}}></div>
            <div className = "mt-10">
                <button className = "x-swapCard-submit-button" onClick = {handleSwap}>{loading?<img src = "/img/box.gif" />:"Swap"}</button>
            </div>

			<div className = "slippage-card">
				<div className= "x-font3"> Slippage <span className = "x-font3-blue border-round">{token1=="ETHER"&&token2=="Atari"?1:slippage}%</span></div>
				<Slider
					defaultValue={30}
					value = {token1=="ETHER"&&token2=="Atari"?1:slippage}
					onChange = {handleSlippage}
					aria-labelledby="discrete-slider"
					valueLabelDisplay="auto"
					disabled={token1=="ETHER"&&token2=="Atari"?true:false}
					step={1}
					marks
					min={1}
					max={100}
				/>
			</div>
        </div>
    )
}

export default SwapCard;