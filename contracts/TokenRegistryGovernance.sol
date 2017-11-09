/*

  Copyright 2017 ZeroEx Intl.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

*/

pragma solidity 0.4.11;

import "./base/Ownable.sol";
import "./TokenRegistry.sol";

contract TokenRegistryGovernance is Ownable {

    // ------------- EVENTS -------------

    // Proposed token event
    event ProposedToken(
        address indexed token,
        string name,
        string symbol,
        uint8 decimals,
        bytes ipfsHash,
        bytes swarmHash
    );

    // Proposal was approved and added to registry
    event ApprovedProposal(uint proposalID);

    // Proposal was refused and added to registry
    event RefusedProposal(uint proposalID);

    // ------------- STRUCTURES -------------

    // Token structure
    struct TokenMetadata {
        address token;
        string name;
        string symbol;
        uint8 decimals;
        bytes ipfsHash;
        bytes swarmHash;
    }

    // ------------- MODIFIERS -------------

    modifier tokenExists(address _token)  {
        address returnedAddress;

        (returnedAddress,) = tokenRegistry.getTokenMetaData(_token);
        require(returnedAddress != address(0));
        _;
    }

    modifier tokenDoesNotExist(address _token) {
        address returnedAddress;

        (returnedAddress,) = tokenRegistry.getTokenMetaData(_token);
        require(returnedAddress == address(0));
        _;
    }

    modifier nameDoesNotExist(string _name) {
        address returnedAddress;

        (returnedAddress,) = tokenRegistry.getTokenByName(_name);
        require(returnedAddress == address(0));
        _;
    }

    modifier symbolDoesNotExist(string _symbol) {
        address returnedAddress;

        (returnedAddress,) = tokenRegistry.getTokenBySymbol(_symbol);
        require(returnedAddress == address(0));
        _;
    }

    modifier addressNotNull(address _address) {
        require(_address != address(0));
        _;
    }

    modifier proposalNotRefused(uint _id){
        require(status[_id] != ProposalStatus.Refused);
        _;
    }

    // ------------- VARIABLES -------------
    enum ProposalStatus { Null, Pending, Approved, Refused }

    mapping (uint => ProposalStatus) status;
    mapping (uint => TokenMetadata) public proposedTokens;

    address tokenRegistryAddress;
    TokenRegistry tokenRegistry;
    uint id = 0;

    // ------------- CONSTRUCTOR -------------

    /// @dev Instantiate token proposal contract.
    /// @param _tokenRegistryAddress : token registry address.
    function TokenRegistryGovernance(address _tokenRegistryAddress) {
        tokenRegistryAddress = _tokenRegistryAddress;
        tokenRegistry = TokenRegistry(_tokenRegistryAddress);
    }


    // ------------- FUNCTIONS -------------

    /// @dev Allows anyone to propose a new token for the registry.
    /// @param _token Address of new token.
    /// @param _name Name of new token.
    /// @param _symbol Symbol for new token.
    /// @param _decimals Number of decimals, divisibility of new token.
    /// @param _ipfsHash IPFS hash of token icon.
    /// @param _swarmHash Swarm hash of token icon.
    function proposeToken(
        address _token,
        string _name,
        string _symbol,
        uint8 _decimals,
        bytes _ipfsHash,
        bytes _swarmHash)
        public
        tokenDoesNotExist(_token)
        addressNotNull(_token)
        nameDoesNotExist(_name)
        symbolDoesNotExist(_symbol)
    {
        proposedTokens[id] = TokenMetadata({
                                              token: _token,
                                              name: _name,
                                              symbol: _symbol,
                                              decimals: _decimals,
                                              ipfsHash: _ipfsHash,
                                              swarmHash: _swarmHash
        });

        status[id] = ProposalStatus.Pending;
        id ++;

        ProposedToken(
            _token,
            _name,
            _symbol,
            _decimals,
            _ipfsHash,
            _swarmHash
        );
    }

    /// @dev Allows owner to approve a proposal to the registry.
    /// @param _id identifier of proposal to approve
    function approveProposal(uint  _id) public onlyOwner proposalNotRefused( _id)
    {

        TokenMetadata memory token = proposedTokens[_id];

        tokenRegistry.addToken(
                                 token.token,
                                 token.name,
                                 token.symbol,
                                 token.decimals,
                                 token.ipfsHash,
                                 token.swarmHash
        );

        status[_id] = ProposalStatus.Approved;
        ApprovedProposal(_id);
    }

    /// @dev Allows owner to refuse a proposal to the registry.
    /// @param _id identifier of proposal to refuse
    function refuseProposal(uint  _id) public onlyOwner
    {
        status[_id] = ProposalStatus.Refused;
        RefusedProposal(_id);
    }

    /// @dev Allows anyone to retrieve the status of a proposal
    /// @param _id identifier of proposal to retrieve
    function getProposalStatus(uint _id) public constant returns (ProposalStatus)
    {
        return status[_id];
    }

    /// @dev Allows anyone to retrieve the status of a proposal
    /// @param _id identifier of proposal to retrieve
    function getProposalMetaData(uint _id) public constant
         returns (
            address,  //tokenAddress
            string,   //name
            string,   //symbol
            uint8,    //decimals
            bytes,    //ipfsHash
            bytes     //swarmHash
         )
    {
        TokenMetadata memory token = proposedTokens[_id];

        return (
            token.token,
            token.name,
            token.symbol,
            token.decimals,
            token.ipfsHash,
            token.swarmHash
        );
    }

    /// @dev Retuns the most recent proposal ID
    function getLastID() public constant returns (uint _id){
        return id-1;
    }

    // ------------- TOKEN REGISTRY WRAPPER FUNCTIONS  -------------

    /// @dev Wrapper function that calls the tokenRegistry.addToken() function.
    /// @param _token Address of new token.
    /// @param _name Name of new token.
    /// @param _symbol Symbol for new token.
    /// @param _decimals Number of decimals, divisibility of new token.
    /// @param _ipfsHash IPFS hash of token icon.
    /// @param _swarmHash Swarm hash of token icon.
    function addToken(
        address _token,
        string _name,
        string _symbol,
        uint8 _decimals,
        bytes _ipfsHash,
        bytes _swarmHash)
        public
        onlyOwner
        tokenDoesNotExist(_token)
        addressNotNull(_token)
        symbolDoesNotExist(_symbol)
        nameDoesNotExist(_name)
    {
        tokenRegistry.addToken(_token, _name, _symbol, _decimals, _ipfsHash, _swarmHash);
    }

    /// @dev Wrapper function that calls the tokenRegistry.removeToken() function.
    /// @param _token Address of existing token.
    /// @param _index Index of _toekn in the tokenRegistry.tokenAddresses
    function removeToken(address _token, uint _index)
        public
        onlyOwner
        tokenExists(_token)
    {
        tokenRegistry.removeToken(_token, _index);
    }

    /// @dev Wrapper function that calls the tokenRegistry.setTokenName() function.
    /// @param _token Address of existing token.
    /// @param _name New name.
    function setTokenName(address _token, string _name)
        public
        onlyOwner
        tokenExists(_token)
        nameDoesNotExist(_name)
    {
        tokenRegistry.setTokenName(_token, _name);
    }

    /// @dev Wrapper function that calls the tokenRegistry.setTokenSymbol() function.
    /// @param _token Address of existing token.
    /// @param _symbol New symbol.
    function setTokenSymbol(address _token, string _symbol)
        public
        onlyOwner
        tokenExists(_token)
        symbolDoesNotExist(_symbol)
    {
        tokenRegistry.setTokenSymbol(_token, _symbol);
    }

    /// @dev Wrapper function that calls the tokenRegistry.setTokenIpfsHash() function.
    /// @param _token Address of existing token.
    /// @param _ipfsHash New IPFS hash.
    function setTokenIpfsHash(address _token, bytes _ipfsHash)
        public
        onlyOwner
        tokenExists(_token)
    {
        tokenRegistry.setTokenIpfsHash(_token, _ipfsHash);
    }

    /// @dev Wrapper function that calls the tokenRegistry.setTokenSwarmHash() function.
    /// @param _token Address of existing token.
    /// @param _swarmHash New Swarm hash.
    function setTokenSwarmHash(address _token, bytes _swarmHash)
        public
        onlyOwner
        tokenExists(_token)
    {
        tokenRegistry.setTokenSwarmHash(_token, _swarmHash);
    }
}
/*

NOTES :

*/
