// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Shitcoin {
    string public name = "ShitCoin";
    string public symbol = "SHT";

    mapping(address => uint256) public wallets;
    uint256 marketCap = 10000000;
    
    address public market;

    constructor(address _market){
        market = _market;
        wallets[market] = marketCap;
    }

    event Transfer(address _from, address _to, uint256 _amount);

    function buy() external payable {
        
        uint256 amount = msg.value / 100000000000000;
        require(wallets[market] >= amount); // Has to have enough coin

        wallets[market] -= amount;
        wallets[msg.sender] += amount;
    }

    function transfer(address _to, uint256 _amount) external {
        require(msg.sender != _to); // Cannot transfer to itself
        require(wallets[msg.sender] >= _amount); // Has to have enough coin

        wallets[msg.sender] -= _amount;
        wallets[_to] += _amount;

        emit Transfer(msg.sender, _to, _amount);
    }

    function transferFrom(address _from, address _to, uint256 _amount) external {
        require(msg.sender == market); // Only market can do this
        require(_from != _to); // Cannot transfer to itself
        require(wallets[_from] >= _amount); // Has to have enough coin

        wallets[_from] -= _amount;
        wallets[_to] += _amount;

        emit Transfer(_from, _to, _amount);
    }
}

contract TaskMarket {

    Shitcoin public sht;
    
    struct Task {
        address owner;
        uint256 payment;
        address rabbit;
        bool done;
    }

    Task[] public tasks;

    constructor(){
        sht = new Shitcoin(address(this));
    }

    function NewTask(address _who, uint256 _pay) external {
        require(sht.wallets(msg.sender) >= _pay);
        require(msg.sender != _who); // Cannot make task for yourself
        require(_pay > 0); // pay must be more than 0
        
        sht.transferFrom(msg.sender, address(this), _pay);

        tasks.push(Task(msg.sender, _pay, _who, false));
    }

    function FinishTask(uint id) external {
        Task storage t = tasks[id];

        require(!t.done); // Task cannot be done already
        require(t.rabbit == msg.sender);

        t.done = true; // Mark task as done
    }

    modifier TaskDoneAndOwner(uint id) {
        Task storage t = tasks[id];
        require(t.done);
        require(t.owner == msg.sender);
        _;
    }

    function AcceptTask(uint id) external TaskDoneAndOwner(id) {
        Task memory t = tasks[id];
        sht.transferFrom(address(this), t.rabbit, t.payment); // Send money
        delete tasks[id]; // Delete task
    }

    function RequestChanges(uint id) external  TaskDoneAndOwner(id) {
        tasks[id].done = false;
    }
}
